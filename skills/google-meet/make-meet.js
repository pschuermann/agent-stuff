#!/usr/bin/env node

import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";
import { google } from "googleapis";
import readline from "node:readline/promises";

const MEET_API_BASE = "https://meet.googleapis.com/v2";
const DEFAULT_ACCESS_TYPE = "TRUSTED";
const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/meetings.space.created",
  "https://www.googleapis.com/auth/cloud-platform",
  "openid",
  "email",
  "profile",
];

const DEFAULT_OAUTH_FILE = path.join(
  os.homedir(),
  ".config",
  "pi-google-meet",
  "oauth-client.json",
);
const DEFAULT_TOKEN_STORE = path.join(
  os.homedir(),
  ".config",
  "pi-google-meet",
  "tokens.json",
);

const args = process.argv.slice(2);
const options = {
  accessType: DEFAULT_ACCESS_TYPE,
  record: true,
  transcribe: true,
  account: null,
};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--no-record") {
    options.record = false;
  } else if (arg === "--no-transcribe") {
    options.transcribe = false;
  } else if (arg === "--access-type") {
    options.accessType = args[index + 1] ?? options.accessType;
    index += 1;
  } else if (arg.startsWith("--access-type=")) {
    options.accessType = arg.split("=")[1] ?? options.accessType;
  } else if (arg === "--account") {
    options.account = args[index + 1] ?? null;
    index += 1;
  } else if (arg.startsWith("--account=")) {
    options.account = arg.split("=")[1] ?? null;
  }
}

const tokenStorePath = process.env.GOOGLE_MEET_TOKEN_STORE || DEFAULT_TOKEN_STORE;
const oauthFilePath = process.env.GOOGLE_MEET_OAUTH_FILE || DEFAULT_OAUTH_FILE;

const loadTokenStore = async () => {
  try {
    const raw = await fs.readFile(tokenStorePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return { accounts: {}, lastUsed: null };
  }
};

const saveTokenStore = async (store) => {
  await fs.mkdir(path.dirname(tokenStorePath), { recursive: true });
  await fs.writeFile(tokenStorePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
};

const loadOAuthCredentials = async () => {
  try {
    const raw = await fs.readFile(oauthFilePath, "utf8");
    const json = JSON.parse(raw);
    return json.installed ?? json.web ?? null;
  } catch {
    return null;
  }
};

const detectPreferredDomain = () => {
  try {
    const url = execSync("git config --get remote.origin.url", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (/github\.com[:/]earendil-works\//.test(url)) {
      return "earendil.com";
    }
  } catch {
    // Not a git repo or missing origin.
  }
  return null;
};

const promptUser = async (question) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
};

const getGcloudAccounts = () => {
  try {
    const raw = execSync("gcloud auth list --format=json", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!raw) {
      return { accounts: [], active: null };
    }
    const parsed = JSON.parse(raw);
    const accounts = parsed.map((entry) => entry.account).filter(Boolean);
    const active =
      parsed.find((entry) => entry.status === "ACTIVE")?.account ?? null;
    return { accounts, active };
  } catch {
    throw new Error(
      "gcloud CLI not available. Install Google Cloud SDK or provide an OAuth client JSON.",
    );
  }
};

const runGcloudLogin = (account) => {
  const args = [
    "auth",
    "application-default",
    "login",
    `--scopes=${DEFAULT_SCOPES.join(",")}`,
  ];
  if (account) {
    console.log(
      `Note: gcloud application-default login does not support account selection; you may choose ${account} in the browser prompt if available.`,
    );
  }
  const result = spawnSync("gcloud", args, { stdio: "inherit" });
  if (result.error || result.status !== 0) {
    throw new Error("gcloud application-default login failed.");
  }
};

const ensureGcloudAccounts = async (account) => {
  let data = getGcloudAccounts();
  if (data.accounts.length === 0 || (account && !data.accounts.includes(account))) {
    console.log("Launching gcloud auth login...");
    runGcloudLogin(account);
    data = getGcloudAccounts();
  }
  return data;
};

const getGcloudAccessToken = () => {
  try {
    const token = execSync(
      `gcloud auth application-default print-access-token --scopes=${DEFAULT_SCOPES.join(",")}`,
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    if (!token) {
      throw new Error("Empty access token.");
    }
    return token;
  } catch {
    throw new Error(
      "Failed to get access token via gcloud. Run `gcloud auth application-default login --scopes=...`.",
    );
  }
};

const pickAccountFromList = async (accounts, preferredDomain, lastUsed, allowAdd) => {
  if (accounts.length === 0) {
    return null;
  }

  const preferred =
    accounts.find((email) => preferredDomain && email.endsWith(`@${preferredDomain}`)) ||
    lastUsed ||
    accounts[0];

  if (accounts.length === 1 && !allowAdd) {
    return preferred;
  }

  console.log("Available Google accounts:");
  accounts.forEach((email, idx) => {
    const label = email === preferred ? " (default)" : "";
    console.log(`  ${idx + 1}) ${email}${label}`);
  });
  if (allowAdd) {
    console.log(`  ${accounts.length + 1}) Add a new account`);
  }

  const answer = await promptUser(
    `Select account [default ${preferred}]: `,
  );

  if (!answer) {
    return preferred;
  }

  const selection = Number.parseInt(answer, 10);
  if (!Number.isNaN(selection)) {
    if (selection >= 1 && selection <= accounts.length) {
      return accounts[selection - 1];
    }
    if (allowAdd && selection === accounts.length + 1) {
      return null;
    }
  }

  if (accounts.includes(answer)) {
    return answer;
  }

  console.log("Invalid selection, using default.");
  return preferred;
};

const pickAccount = async (store, preferredDomain) => {
  const accounts = Object.keys(store.accounts ?? {});
  if (options.account && accounts.includes(options.account)) {
    return options.account;
  }

  if (options.account && !accounts.includes(options.account)) {
    console.log(`Account ${options.account} not found. Starting OAuth flow to add it.`);
    return null;
  }

  return pickAccountFromList(accounts, preferredDomain, store.lastUsed, true);
};

const openBrowser = (url) => {
  let command = null;
  let commandArgs = [];

  if (process.platform === "darwin") {
    command = "open";
    commandArgs = [url];
  } else if (process.platform === "win32") {
    command = "cmd";
    commandArgs = ["/c", "start", "", url];
  } else {
    command = "xdg-open";
    commandArgs = [url];
  }

  const result = spawnSync(command, commandArgs, { stdio: "ignore" });
  if (result.error || result.status !== 0) {
    console.log("Open this URL in your browser:");
    console.log(url);
  }
};

const resolveRedirectConfig = (credentials) => {
  const redirectUris = credentials.redirect_uris ?? [];
  const localRedirect = redirectUris.find(
    (uri) =>
      uri.startsWith("http://localhost") ||
      uri.startsWith("http://127.0.0.1"),
  );

  if (localRedirect) {
    const parsed = new URL(localRedirect);
    const port = parsed.port ? Number(parsed.port) : null;
    return {
      type: "local",
      port,
      host: parsed.hostname,
      path: parsed.pathname || "/oauth2callback",
    };
  }

  const manualRedirect = redirectUris.find(
    (uri) => uri !== "urn:ietf:wg:oauth:2.0:oob",
  );
  return { type: "manual", redirectUri: manualRedirect ?? null };
};

const authorize = async () => {
  const credentials = await loadOAuthCredentials();
  if (!credentials) {
    throw new Error(
      `Missing OAuth client file. Set GOOGLE_MEET_OAUTH_FILE or place credentials at ${oauthFilePath}.`,
    );
  }

  const { client_id: clientId, client_secret: clientSecret } = credentials;
  if (!clientId || !clientSecret) {
    throw new Error("OAuth client file missing client_id or client_secret.");
  }

  const oauth2Client = new google.auth.OAuth2({ clientId, clientSecret });
  const redirectConfig = resolveRedirectConfig(credentials);

  let code = null;
  let server = null;

  if (redirectConfig.type === "local") {
    server = http.createServer();
    const codePromise = new Promise((resolve, reject) => {
      server.on("request", (req, res) => {
        const requestUrl = new URL(
          req.url ?? "/",
          `http://${redirectConfig.host}`,
        );
        const codeParam = requestUrl.searchParams.get("code");
        if (codeParam) {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("Authentication complete. You can close this window.");
          resolve(codeParam);
        } else {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing code parameter.");
          reject(new Error("Missing OAuth code."));
        }
      });
    });

    const listenPort = redirectConfig.port ?? 0;
    await new Promise((resolve) =>
      server.listen(listenPort, redirectConfig.host, resolve),
    );
    const { port } = server.address();
    const redirectUri = `http://${redirectConfig.host}:${port}${redirectConfig.path}`;
    oauth2Client.redirectUri = redirectUri;

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: DEFAULT_SCOPES,
      prompt: "consent",
    });

    console.log("Opening browser for Google authentication...");
    openBrowser(authUrl);
    console.log(`If your browser doesn't open, visit:\n${authUrl}`);

    try {
      code = await codePromise;
    } catch {
      const manualCode = await promptUser("Paste the OAuth code from the browser: ");
      if (!manualCode) {
        throw new Error("No OAuth code provided.");
      }
      code = manualCode;
    } finally {
      server.close();
    }
  } else {
    if (redirectConfig.redirectUri) {
      oauth2Client.redirectUri = redirectConfig.redirectUri;
    }

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: DEFAULT_SCOPES,
      prompt: "consent",
    });

    console.log("Opening browser for Google authentication...");
    openBrowser(authUrl);
    console.log(`If your browser doesn't open, visit:\n${authUrl}`);

    const manualCode = await promptUser("Paste the OAuth code from the browser: ");
    if (!manualCode) {
      throw new Error("No OAuth code provided.");
    }
    code = manualCode;
  }

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email;
  if (!email) {
    throw new Error("Failed to determine account email.");
  }

  return { oauth2Client, email, tokens };
};

const getAuthenticatedClient = async (store, email) => {
  const credentials = await loadOAuthCredentials();
  if (!credentials) {
    throw new Error(
      `Missing OAuth client file. Set GOOGLE_MEET_OAUTH_FILE or place credentials at ${oauthFilePath}.`,
    );
  }

  const { client_id: clientId, client_secret: clientSecret } = credentials;
  const oauth2Client = new google.auth.OAuth2({ clientId, clientSecret });
  oauth2Client.setCredentials(store.accounts[email]?.tokens ?? {});

  try {
    const tokenResponse = await oauth2Client.getAccessToken();
    if (!tokenResponse?.token) {
      throw new Error("Missing access token.");
    }
    oauth2Client.setCredentials({
      ...oauth2Client.credentials,
      access_token: tokenResponse.token,
    });
    return { oauth2Client, token: tokenResponse.token };
  } catch (error) {
    throw new Error(`Token refresh failed for ${email}: ${error.message ?? error}`);
  }
};

const mergeTokens = (existingTokens, newTokens) => ({
  ...existingTokens,
  ...newTokens,
  refresh_token: newTokens.refresh_token ?? existingTokens?.refresh_token,
});

const isTokenFresh = (tokens) => {
  if (!tokens?.access_token) {
    return false;
  }
  if (tokens.expiry_date) {
    return Date.now() < tokens.expiry_date - 60_000;
  }
  return true;
};

const getStoredAccessToken = async (store, preferredDomain) => {
  const accounts = Object.keys(store.accounts ?? {});
  if (accounts.length === 0) {
    return { token: null, account: null };
  }

  let selected = null;
  if (options.account && accounts.includes(options.account)) {
    selected = options.account;
  } else {
    selected = await pickAccountFromList(
      accounts,
      preferredDomain,
      store.lastUsed,
      false,
    );
  }

  if (!selected) {
    return { token: null, account: null };
  }

  const tokens = store.accounts[selected]?.tokens ?? {};
  if (!isTokenFresh(tokens)) {
    console.log(`Stored token for ${selected} is missing or expired.`);
    return { token: null, account: selected };
  }

  return { token: tokens.access_token, account: selected };
};

const createSpace = async ({ token, accessType, record, transcribe }) => {
  const response = await fetch(`${MEET_API_BASE}/spaces`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      config: {
        accessType,
        artifactConfig: {
          recordingConfig: {
            autoRecordingGeneration: record ? "ON" : "OFF",
          },
          transcriptionConfig: {
            autoTranscriptionGeneration: transcribe ? "ON" : "OFF",
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Meet API error ${response.status}: ${errorBody}`);
  }

  return response.json();
};

const main = async () => {
  const store = await loadTokenStore();
  const preferredDomain = detectPreferredDomain();
  const oauthCredentials = await loadOAuthCredentials();

  let token = null;
  let selectedAccount = null;

  if (oauthCredentials) {
    selectedAccount = await pickAccount(store, preferredDomain);
    let oauth2Client = null;

    if (selectedAccount) {
      try {
        const authResult = await getAuthenticatedClient(store, selectedAccount);
        oauth2Client = authResult.oauth2Client;
        token = authResult.token;
      } catch (error) {
        console.log(error.message ?? String(error));
        console.log("Re-authenticating...");
        selectedAccount = null;
      }
    }

    if (!selectedAccount) {
      const authResult = await authorize();
      oauth2Client = authResult.oauth2Client;
      token = authResult.tokens.access_token;
      if (!token) {
        const tokenResponse = await oauth2Client.getAccessToken();
        token = tokenResponse.token;
      }
      selectedAccount = authResult.email;
      if (options.account && options.account !== selectedAccount) {
        console.log(
          `Authenticated as ${selectedAccount} (requested ${options.account}).`,
        );
      }

      store.accounts[selectedAccount] = {
        tokens: authResult.tokens,
        updatedAt: new Date().toISOString(),
      };
    } else {
      store.accounts[selectedAccount] = {
        ...store.accounts[selectedAccount],
        tokens: mergeTokens(store.accounts[selectedAccount]?.tokens, oauth2Client.credentials),
        updatedAt: new Date().toISOString(),
      };
    }
  } else {
    const stored = await getStoredAccessToken(store, preferredDomain);
    token = stored.token;
    selectedAccount = stored.account;

    if (!token) {
      let { accounts, active } = await ensureGcloudAccounts(options.account);

      if (options.account && accounts.includes(options.account)) {
        selectedAccount = options.account;
      }

      while (!selectedAccount) {
        const lastUsed = store.lastUsed ?? active;
        selectedAccount = await pickAccountFromList(
          accounts,
          preferredDomain,
          lastUsed,
          true,
        );

        if (!selectedAccount) {
          console.log("Launching gcloud auth login to add another account...");
          runGcloudLogin(null);
          ({ accounts, active } = getGcloudAccounts());
        }
      }

      token = getGcloudAccessToken();
    }
  }

  store.lastUsed = selectedAccount;
  await saveTokenStore(store);

  const space = await createSpace({
    token,
    accessType: options.accessType,
    record: options.record,
    transcribe: options.transcribe,
  });

  const authUserParam = selectedAccount
    ? `?authuser=${encodeURIComponent(selectedAccount)}`
    : "";

  console.log("Created Meet space:");
  console.log(`- name: ${space.name}`);
  console.log(`- meetingUri: ${space.meetingUri}${authUserParam}`);
  console.log(`- meetingCode: ${space.meetingCode}`);
  console.log(`- accessType: ${space.config?.accessType ?? options.accessType}`);
  console.log(
    "Note: auto recording/transcription start when an eligible host joins, and must be allowed by Workspace policy.",
  );
};

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
