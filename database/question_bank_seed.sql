-- Question bank seed for PreparationAI
-- Curated questions retrieved (by tag overlap and full-text match) to ground AI question generation,
-- used as a fallback when the AI is unavailable, and exported as a fine-tuning seed dataset.
-- Tags are lowercase. Experience levels match the warm-up screen: 0 entry .. 5 lead/principal.
-- Safe to re-run: existing questions are skipped.

INSERT INTO question_bank (question_text, question_type, tags, min_experience, max_experience) VALUES
-- General / behavioral
('Tell me about a project you are proud of. What was your specific contribution and what would you do differently now?', 'behavioral', ARRAY['general'], 0, 5),
('Describe a time you disagreed with a teammate about a technical decision. How was it resolved?', 'behavioral', ARRAY['general'], 0, 5),
('Tell me about a time you missed a deadline or were about to. What did you do and what did you learn?', 'behavioral', ARRAY['general'], 0, 5),
('Describe a bug that took you a long time to find. How did you eventually track it down?', 'behavioral', ARRAY['general'], 0, 5),
('How do you approach learning a new technology or codebase quickly?', 'behavioral', ARRAY['general'], 0, 3),
('Tell me about a time you received critical feedback on your work. How did you respond?', 'behavioral', ARRAY['general'], 0, 5),
('Describe a time you had to push back on a product requirement. How did you make your case?', 'behavioral', ARRAY['general'], 2, 5),
('Tell me about a time you mentored or unblocked another engineer.', 'behavioral', ARRAY['general'], 2, 5),
('Describe a technical decision you made that affected multiple teams. How did you get alignment?', 'behavioral', ARRAY['general'], 3, 5),
('Tell me about a production incident you were involved in. What was your role and what changed afterwards?', 'behavioral', ARRAY['general', 'devops', 'backend'], 2, 5),
('How do you decide when code is good enough to ship versus when it needs more work?', 'behavioral', ARRAY['general'], 1, 5),
('Describe how you would onboard into a team whose main service has little documentation and few tests.', 'behavioral', ARRAY['general'], 2, 5),
('What is the difference between a process and a thread, and when would you choose one over the other?', 'technical', ARRAY['general', 'backend'], 0, 3),
('Explain Big-O notation and give the time complexity of looking up a key in a hash map versus a balanced binary search tree.', 'technical', ARRAY['general'], 0, 2),
('How would you design tests for a function that depends on the current time or a random number generator?', 'technical', ARRAY['general'], 1, 4),
('What makes code hard to change, and what practices do you use to keep a codebase maintainable?', 'technical', ARRAY['general'], 2, 5),
('Design a URL shortener. Cover the data model, how short codes are generated, and how it scales to heavy read traffic.', 'system_design', ARRAY['general', 'backend'], 2, 5),
('Design a rate limiter for a public API. What algorithm would you use and where would the state live?', 'system_design', ARRAY['general', 'backend', 'api'], 2, 5),

-- Frontend / React / JavaScript / TypeScript
('Explain the difference between props and state in React, and when state should be lifted up.', 'technical', ARRAY['frontend', 'react'], 0, 2),
('What does the dependency array of useEffect control, and what bugs come from getting it wrong?', 'technical', ARRAY['frontend', 'react'], 0, 3),
('How would you find and fix a React component that re-renders far more often than it should?', 'technical', ARRAY['frontend', 'react'], 1, 4),
('When would you reach for a global state library instead of React context or local state?', 'technical', ARRAY['frontend', 'react'], 2, 5),
('Explain the JavaScript event loop, including the difference between microtasks and macrotasks.', 'technical', ARRAY['frontend', 'javascript', 'node.js'], 1, 4),
('What is the difference between == and === in JavaScript, and why does it matter?', 'technical', ARRAY['frontend', 'javascript'], 0, 1),
('How do TypeScript generics work? Give an example where they make an API safer.', 'technical', ARRAY['frontend', 'typescript'], 1, 4),
('What is the difference between an interface and a type alias in TypeScript?', 'technical', ARRAY['frontend', 'typescript'], 0, 3),
('How would you make a slow-loading single-page app feel faster? Walk through what you would measure first.', 'technical', ARRAY['frontend', 'react', 'javascript'], 2, 5),
('Explain how the browser turns HTML, CSS and JavaScript into pixels, and which steps are expensive.', 'technical', ARRAY['frontend'], 2, 5),
('How do you make a custom dropdown component accessible to keyboard and screen-reader users?', 'technical', ARRAY['frontend', 'react'], 1, 4),
('What is cross-site scripting (XSS) and how does a framework like React reduce the risk?', 'technical', ARRAY['frontend', 'react', 'javascript'], 1, 4),
('Design the frontend architecture for a large dashboard used by several teams. How do you split ownership and share components?', 'system_design', ARRAY['frontend', 'react'], 3, 5),
('Design an infinite-scrolling feed in the browser. How do you handle pagination, caching and memory?', 'system_design', ARRAY['frontend', 'react', 'javascript'], 2, 5),

-- Backend / APIs / Node.js / Go / databases
('What makes an API endpoint idempotent, and why does it matter for retries?', 'technical', ARRAY['backend', 'api'], 1, 4),
('Compare REST and GraphQL. When would you choose each?', 'technical', ARRAY['backend', 'api', 'full stack'], 1, 4),
('How do you store user passwords securely, and why are fast hashes like SHA-256 a poor choice?', 'technical', ARRAY['backend', 'api', 'full stack'], 0, 3),
('Explain how JWT-based authentication works and how you would handle logout or token revocation.', 'technical', ARRAY['backend', 'api', 'full stack'], 1, 4),
('What is a database index, and when can adding one make performance worse?', 'technical', ARRAY['backend', 'postgresql', 'databases'], 0, 3),
('Explain transaction isolation levels and give an example of an anomaly each one prevents.', 'technical', ARRAY['backend', 'postgresql', 'databases'], 2, 5),
('What is the N+1 query problem and how do you detect and fix it?', 'technical', ARRAY['backend', 'postgresql', 'databases', 'full stack'], 1, 4),
('How would you run a schema migration on a large table without downtime?', 'technical', ARRAY['backend', 'postgresql', 'databases'], 3, 5),
('When would you choose a document database like MongoDB over a relational database?', 'technical', ARRAY['backend', 'mongodb', 'databases'], 1, 4),
('How does Node.js handle many concurrent connections on a single thread, and what workloads break that model?', 'technical', ARRAY['backend', 'node.js'], 1, 4),
('Explain goroutines and channels in Go. How would you stop a group of goroutines cleanly?', 'technical', ARRAY['backend', 'go'], 1, 4),
('What would you put in a cache, how would you invalidate it, and what can go wrong?', 'technical', ARRAY['backend', 'redis'], 1, 5),
('Design a notification service that sends email, SMS and push messages to millions of users.', 'system_design', ARRAY['backend', 'api'], 3, 5),
('Design the backend for a real-time chat application. Cover message delivery, ordering and storage.', 'system_design', ARRAY['backend', 'node.js', 'full stack'], 2, 5),
('Design a job queue that guarantees each job runs at least once. How do you handle failures and duplicates?', 'system_design', ARRAY['backend', 'redis', 'api'], 3, 5),

-- Unity / game development / C#
('Explain the Unity MonoBehaviour lifecycle: Awake, OnEnable, Start, Update, FixedUpdate and LateUpdate.', 'technical', ARRAY['unity', 'game development', 'c#'], 0, 2),
('When should physics code run in FixedUpdate instead of Update, and why?', 'technical', ARRAY['unity', 'game development'], 0, 3),
('What causes garbage collection spikes in a Unity game, and how do you avoid them in hot code paths?', 'technical', ARRAY['unity', 'game development', 'c#'], 1, 4),
('How would you profile a Unity game that drops frames on mobile devices? What do you look at first?', 'technical', ARRAY['unity', 'game development', 'mobile development'], 2, 5),
('Compare ScriptableObjects and MonoBehaviours for storing game data. When would you use each?', 'technical', ARRAY['unity', 'game development'], 1, 4),
('How do coroutines work in Unity, and how do they differ from async/await in C#?', 'technical', ARRAY['unity', 'c#'], 1, 4),
('Explain object pooling. When is it worth the extra complexity in a game?', 'technical', ARRAY['unity', 'game development'], 0, 3),
('What is the difference between value types and reference types in C#, and how does it affect performance?', 'technical', ARRAY['c#', 'unity'], 0, 3),
('How would you structure a Unity project so that several developers can work on scenes and prefabs without constant merge conflicts?', 'technical', ARRAY['unity', 'game development'], 2, 5),
('Explain the difference between client-side and server-side authority in multiplayer games.', 'technical', ARRAY['unity', 'multiplayer', 'netcode', 'game development'], 1, 4),
('How would you hide network latency for player movement in a fast-paced multiplayer game?', 'technical', ARRAY['unity', 'multiplayer', 'netcode', 'game development'], 2, 5),
('How would you secure a client-server multiplayer architecture in Unity using Netcode?', 'technical', ARRAY['unity', 'multiplayer', 'netcode'], 2, 5),
('Design the save-game system for an open-world game. How do you handle versioning when the save format changes?', 'system_design', ARRAY['unity', 'game development'], 2, 5),
('Design the backend for matchmaking in a competitive online game. How do you balance wait time against match quality?', 'system_design', ARRAY['multiplayer', 'game development', 'backend'], 3, 5),
('Design network synchronization for a real-time multiplayer game with 32 players per match.', 'system_design', ARRAY['unity', 'multiplayer', 'netcode', 'game development'], 3, 5),

-- Data science / machine learning / AI / Python
('Explain overfitting and the techniques you use to detect and reduce it.', 'technical', ARRAY['machine learning', 'data science', 'ai'], 0, 3),
('What is the difference between precision and recall, and when would you optimise for one over the other?', 'technical', ARRAY['machine learning', 'data science'], 0, 3),
('How would you handle a classification dataset where only 1% of examples are positive?', 'technical', ARRAY['machine learning', 'data science'], 1, 4),
('Explain the bias-variance trade-off with a concrete example.', 'technical', ARRAY['machine learning', 'data science'], 1, 4),
('What is data leakage? Give an example of how it can sneak into a training pipeline.', 'technical', ARRAY['machine learning', 'data science'], 1, 5),
('How does gradient descent work, and what problems does a badly chosen learning rate cause?', 'technical', ARRAY['machine learning', 'ai'], 0, 3),
('Explain how attention works in a transformer at a high level.', 'technical', ARRAY['machine learning', 'ai'], 2, 5),
('When would you fine-tune a language model instead of using retrieval-augmented generation (RAG)?', 'technical', ARRAY['ai', 'machine learning'], 2, 5),
('How would you evaluate an LLM-powered feature before and after launch?', 'technical', ARRAY['ai', 'machine learning'], 2, 5),
('What is the difference between a Python list and a NumPy array, and why is NumPy faster for numeric work?', 'technical', ARRAY['python', 'data science'], 0, 2),
('Explain Python generators and when you would use one instead of building a list.', 'technical', ARRAY['python'], 0, 3),
('How does the GIL affect multithreaded Python code, and how do you work around it?', 'technical', ARRAY['python', 'backend'], 2, 5),
('Design a system that retrains and redeploys a recommendation model every day. How do you catch a bad model before users see it?', 'system_design', ARRAY['machine learning', 'data science', 'ai'], 3, 5),
('Design a retrieval-augmented question-answering system over a company''s internal documents.', 'system_design', ARRAY['ai', 'machine learning', 'backend'], 3, 5),

-- DevOps / cloud / containers
('What is the difference between a container and a virtual machine?', 'technical', ARRAY['devops', 'docker', 'cloud computing'], 0, 2),
('How would you make a Docker image smaller and faster to build?', 'technical', ARRAY['devops', 'docker'], 1, 4),
('Explain Kubernetes Deployments, Services and Ingress, and how a request reaches a pod.', 'technical', ARRAY['devops', 'kubernetes'], 1, 4),
('How do liveness and readiness probes differ in Kubernetes, and what goes wrong if they are misconfigured?', 'technical', ARRAY['devops', 'kubernetes'], 2, 5),
('How would you set up a CI/CD pipeline so that a bad deploy can be rolled back quickly?', 'technical', ARRAY['devops', 'cloud computing'], 2, 5),
('What is infrastructure as code, and what problems does it solve compared with configuring servers by hand?', 'technical', ARRAY['devops', 'aws', 'cloud computing'], 0, 3),
('How do you manage secrets for applications running in the cloud?', 'technical', ARRAY['devops', 'aws', 'cloud computing'], 1, 4),
('Which metrics, logs and alerts would you set up for a new web service, and how do you avoid alert fatigue?', 'technical', ARRAY['devops', 'backend'], 2, 5),
('Design a highly available deployment of a web application on AWS across multiple availability zones.', 'system_design', ARRAY['devops', 'aws', 'cloud computing'], 3, 5),
('Design a logging pipeline that collects logs from hundreds of services and makes them searchable.', 'system_design', ARRAY['devops', 'cloud computing', 'backend'], 3, 5),

-- Mobile
('How do you keep a mobile app responsive while it loads data over a slow network?', 'technical', ARRAY['mobile development'], 0, 3),
('How would you design offline support for a mobile app that syncs with a server?', 'system_design', ARRAY['mobile development'], 2, 5),
('What are the main causes of battery drain in mobile apps, and how do you find them?', 'technical', ARRAY['mobile development'], 1, 4),

-- Blockchain / Web3
('What is a smart contract, and what makes bugs in smart contracts especially costly?', 'technical', ARRAY['blockchain', 'web3'], 0, 3),
('Explain a reentrancy attack and how to prevent it in a smart contract.', 'technical', ARRAY['blockchain', 'web3'], 2, 5)
ON CONFLICT (question_text) DO NOTHING;
