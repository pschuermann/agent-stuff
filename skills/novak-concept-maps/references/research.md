# Research Notes: Novak-Style Concept Maps

These notes summarize the research base used by the skill. They are meant to guide output quality, not to replace the original sources.

## Primary Ideas From Novak And Cañas

Novak and Cañas define concept maps as tools for organizing and representing knowledge. A concept is a label for a perceived regularity in events, objects, or records. A proposition joins two or more concepts with linking words or phrases to form a meaningful statement. This is the key distinction: a concept map is a set of propositions, not a graph of related keywords.

The usual visual form is hierarchical. More general and inclusive concepts appear near the top; more specific concepts appear lower. The hierarchy depends on context, so the map should be built to answer a focus question. A map about "learning" will look different if the question is "How does meaningful learning happen?" rather than "How should a teacher assess learning?"

Cross-links matter because they connect different regions of the map. Novak and Cañas treat good cross-links as evidence of integration and sometimes creativity. They should be selected because they clarify the focus question, not because two concepts can be connected somehow.

The recommended construction sequence is:

1. Choose a familiar and bounded domain.
2. Write a focus question.
3. Identify a parking lot of key concepts, often 15 to 25.
4. Rank concepts from most general to most specific.
5. Build a preliminary map using linking phrases.
6. Revise the map and search for useful cross-links.

Good propositions should make sense when read independently. Linking phrases are usually short and include a verb. Concept labels should use the minimum words needed. Long sentences inside boxes are a warning sign that the mapmaker is hiding a whole subnet inside one node.

## Meaningful Learning

Novak's theory follows David Ausubel's account of meaningful learning. The learner must have relevant prior knowledge, the material must be conceptually clear, and the learner must choose to connect new ideas with existing knowledge. Concept maps help because they make the learner's concept and proposition structure visible enough to revise.

Novak's 2002 paper on meaningful learning and conceptual change frames misconceptions as limited or inappropriate propositional hierarchies. In map terms, a misconception may appear as a missing concept, a faulty link, or a vague linking phrase. That makes concept maps useful for diagnosis as well as study.

## Playlist Notes

The provided playlist contains seven short CmapTools videos from 2015 featuring Joseph D. Novak and Alberto J. Cañas, plus a 2018 software-domain talk by James Ross.

- "What is Knowledge" explains knowledge as concepts connected into propositions. It uses "book" as an example of a concept label for a perceived regularity.
- "What Is Meaningful Learning" emphasizes that learners integrate new concepts and propositions with relevant prior knowledge, and that the learner chooses to make those connections.
- "The Origins of Concept Mapping" traces the method to Novak's 1970s Cornell work on children's science learning. Concept maps were created to represent what interviews could not show clearly: which concepts children connected and how.
- "The Importance of the Focus Question" says the focus question anchors teacher feedback. A useful prompt is to ask how a part of the map contributes to answering the focus question.
- "The Importance of Linking Words" stresses that two concepts alone do not make a meaning. The linking phrase creates the proposition, and it should be brief.
- "How Concept Mapping can Help Clarify Misconceptions" frames misconceptions as faulty relationships, missing concepts, or wrong connections. The seasons example turns on the missing concept of Earth's axial tilt.
- "How to Introduce Students to Concept Mapping" recommends starting with a simple six-to-eight-concept map, presenting it as a starting point rather than a final answer, and improving it through discussion.
- James Ross's "Software Art Thou: Concept Mapping" applies concept maps to software domains and team knowledge. The strongest design takeaway is to store maps as propositions first and render views from them. He also uses independent concept maps from team members to test whether a team really shares a mental model.

## Working Minds: Concept Maps As Cognitive Task Analysis

Chapter 4 of Beth Crandall, Gary Klein, and Robert Hoffman's `Working Minds: A Practitioner's Guide to Cognitive Task Analysis` is titled "Using Concept Maps for Knowledge Elicitation and Representation." It extends the Novak/Cañas tradition into Cognitive Task Analysis. The chapter treats concept mapping as both an elicitation method and a representation method: the practitioner explains domain knowledge while the map is built in front of them.

The chapter reinforces the core Novakian distinctions: concepts are short node labels, links are meaningfully labeled, and node-link-node triples should read as stand-alone propositions. It also gives a useful warning for AI-generated maps: a normal sentence can contain several propositions, so do not collapse a whole sentence into a single concept node.

The chapter adds several practical heuristics for expert knowledge capture:

- Start with a domain and focus question that match the research or learning goal.
- Ask for 5 to 10 broad, important concepts before linking everything.
- Use a parking lot and arrange more inclusive concepts toward the top.
- Avoid sentences in concept boxes; split multiword labels when the words name separate concepts.
- Use tentative candidate linking phrases during interviews, but let the practitioner decide the wording.
- Keep an eye out for "conceptual blocks"; moving to another part of the map can unlock the stuck relation.
- Expect one-hour sessions to produce semirefined maps that need later refinement.
- Use cross-links to reveal tacit knowledge and connect separate regions of expertise.
- Treat concept maps as living representations rather than finished objects.

The chapter also contributes CTA-specific quality checks:

- A map should be comprehensive relative to the focus question, not comprehensive in every possible direction.
- A map should have global relevance; prune concepts that wander away from the focus.
- A map should have the right granularity. If a broad map dives into tiny details, split the details into a submap. If a specific map includes unnecessary abstractions, remove them or refocus.
- If more than four or five concepts fan out directly under one concept, look for an intermediate concept that has remained tacit.
- Prefer using a concept label once per map. Repeated labels often mean the structure needs rearranging.

The chapter's knowledge-model idea is especially useful for Codex artifacts. A set of linked concept maps can become a domain knowledge model. Resources attached to concept nodes can include cases, images, charts, procedures, manuals, forms, videos, or live data links. In Codex terms, a skill can produce a map-of-maps, Markdown files, Mermaid views, CXL exports, and links to supporting resources.

For team mapping, the chapter recommends small groups when possible and suggests several workflows: compare maps made by individuals, assemble a global map, have a leader seed a preliminary map, or divide into subteams by subdomain. This fits the James Ross playlist item: compare propositions across people to test whether the team really shares a mental model.

## Moon Et Al.: Assessment And Large-Map Sensemaking

Moon and colleagues extend concept mapping into adult learning assessment and large-scale qualitative analysis. Their assessment workflow is useful because it turns map differences into targeted learning tasks instead of treating a map as a generic diagram.

In the adult learner assessment paper, the proposed sequence is:

1. Use concept mapping to elicit knowledge from experienced, intermediate, and novice learners.
2. Identify assessment areas from expert-novice differences.
3. Build concept-map-based assessment items, especially Multiple Choice Concept Maps.
4. Use the items before and after training to detect knowledge change.

The main design implication is that assessment items should be generated from meaningful proposition differences. A useful item tests a concept, link, proposition, hierarchy level, theme, or perspective that distinguishes stronger understanding from weaker understanding. Proposition counts can provide a rough signal, but they are not enough. Good assessment looks at detail, nuance, valid cross-links, and perspective-taking.

Multiple Choice Concept Maps ask the learner to answer inside a map context. The missing element can be a concept, linking phrase, proposition, or map level. This can make the item both an assessment and a learning event because the learner has to interpret the surrounding map. Moon et al. also note that adult learners may be confused by this unfamiliar format, so the skill should orient the learner before using MCCM items.

Select-And-Fill-In tasks are another good fit for adult learners. They let the learner choose from supplied concepts or links while still constructing part of the proposition. This is useful when a full blank-map reconstruction would be too hard but a normal multiple-choice question would be too shallow.

The Studying Transformation paper uses CmapTools to inspect a large body of Cognitive Task Analysis interview data. The team converted interview material into propositionally coherent concept maps, merged maps into large master maps, and used list views to inspect concepts, links, propositions, subsets, and submaps. The important warning is that large maps do not interpret themselves. Analysts still need frames, tentative hypotheses, and domain judgment. The skill should therefore ask the human for an interpretive frame before drawing conclusions from a large map.

That paper also emphasizes auditability. One of the strengths of the approach is that an analyst can trace from interview statements to propositions to map regions to conclusions. For Codex, this means source notes, proposition IDs, and map-comparison notes should be preserved when maps are built from documents, interviews, or learner work.

## Display Strategy For Codex

Markdown renderers and Mermaid diagrams can display concept boxes and labeled edges, but they usually cannot display Novak-style maps close to CmapTools. In CmapTools, concepts and linking phrases are separate visual objects, and a proposition is visually formed by two connections: concept to linking phrase, then linking phrase to concept. Mermaid edge labels collapse the linking phrase into the edge, which is convenient but less faithful.

The reliable approach is:

- Keep a structured proposition model as the source of truth.
- Render standalone HTML for serious side-panel viewing.
- In the HTML view, render concept boxes and linking phrases as separate positioned objects.
- Draw two line segments per proposition so the linking phrase sits spatially between the concepts.
- Use explicit coordinates for faithful replicas of CmapTools examples. Automatic hierarchy layout is useful for drafts, but hand placement is needed for dense maps with many cross-links or repeated linking phrases.
- Include a proposition table below the diagram.
- Render Mermaid only as a quick Markdown fallback.
- Export CXL when a CmapTools bridge is useful.
- For assessment artifacts, include orientation text, targeted tasks, rationales, and rubrics in the side panel.

Three replica examples are included with the skill:

- `examples/replicas/seasons.json` approximates IHMC's "What causes Seasons?" map from the propositions guide.
- `examples/replicas/birds.json` approximates IHMC's completed Birds map from the first-concept-map guide.
- `examples/replicas/concept-maps.json` approximates the large "Concept Maps" map from Novak and Cañas's concept-map overview.

CXL is IHMC's XML-based language for Cmaps. It stores concepts, linking phrases, connections, propositions, and appearances. The included renderer creates a minimal CXL file with concept nodes, linking phrase nodes, and two connections per proposition.

## Sources

- Novak, J. D., and Cañas, A. J. "The Theory Underlying Concept Maps and How to Construct and Use Them." IHMC CmapTools Technical Report 2006-01 Rev 2008-01. https://cmap.ihmc.us/docs/theory-of-concept-maps
- IHMC Cmap documentation, "What is a Concept Map?" https://cmap.ihmc.us/docs/conceptmap.php
- IHMC Cmap documentation, "What are Propositions?" https://cmap.ihmc.us/docs/proposition.php
- IHMC Cmap documentation, "Constructing your First Concept Map." https://cmap.ihmc.us/docs/constructingaconceptmap.php
- IHMC, "CXL: An XML-based language for describing the content of Cmaps." https://cmap.ihmc.us/xml/cxl.html
- Novak, J. D., and Gowin, D. B. `Learning How to Learn`. Cambridge University Press, 1984. https://www.cambridge.org/core/books/learning-how-to-learn/D4E082D454735D8CC7FEDADFA25A3B99
- Novak, J. D. `Learning, Creating, and Using Knowledge: Concept Maps as Facilitative Tools in Schools and Corporations`, 2nd ed. Routledge, 2010. https://www.routledge.com/Learning-Creating-and-Using-Knowledge-Concept-Maps-as-Facilitative-Tools-in-Schools-and-Corporations/Novak/p/book/9780415991858
- Novak, J. D. "Meaningful Learning: The Essential Factor for Conceptual Change in Limited or Inappropriate Propositional Hierarchies Leading to Empowerment of Learners." `Science Education` 86(4), 548-571, 2002. https://doi.org/10.1002/sce.10032
- Crandall, B., Klein, G. A., and Hoffman, R. R. `Working Minds: A Practitioner's Guide to Cognitive Task Analysis`. MIT Press, 2006. Chapter 4: "Using Concept Maps for Knowledge Elicitation and Representation." Local PDF reviewed at `/Users/pschuermann/Zotero/storage/RAEW9Z6Q/Crandall et al_2006_Working minds.pdf`.
- Moon, B., Hoffman, R. R., and colleagues. "Concept Map-based Assessment for Adult Learners." Local PDF reviewed at `/Users/pschuermann/Zotero/storage/M6TMQBES/Moon et al_Concept Map -based assessment for adult learners.pdf`.
- Moon, B., Hoffman, R. R., and colleagues. "Studying Transformation." Local PDF reviewed at `/Users/pschuermann/Zotero/storage/ZQDHPVP3/Moon et al_Studying Transformation.pdf`.
- Playlist reviewed: https://youtube.com/playlist?list=PLrI0nsHFvBMoxD3s93pxeKuiCKU5jacId
