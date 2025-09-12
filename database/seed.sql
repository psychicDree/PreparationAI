-- Seed data for PreparationAI Database
-- Sample data for development and testing

-- Insert sample users
INSERT INTO users (id, email, password_hash, name) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'john.doe@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John Doe'),
    ('550e8400-e29b-41d4-a716-446655440001', 'jane.smith@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane Smith');

-- Insert sample user profiles
INSERT INTO user_profiles (user_id, experience, skills, preferences) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 5, ARRAY['Unity', 'C#', 'Netcode', 'Multiplayer'], '{"preferred_difficulty": "intermediate", "focus_areas": ["technical", "system_design"]}'),
    ('550e8400-e29b-41d4-a716-446655440001', 3, ARRAY['React', 'TypeScript', 'Node.js'], '{"preferred_difficulty": "beginner", "focus_areas": ["behavioral", "technical"]}');

-- Insert sample interview sessions
INSERT INTO interview_sessions (id, user_id, session_type, status, tags) VALUES
    ('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'standard', 'completed', ARRAY['Unity', 'Netcode', 'Multiplayer']),
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'quick_drill', 'active', ARRAY['React', 'TypeScript']);

-- Insert sample questions
INSERT INTO session_questions (id, session_id, question_text, question_type, order_index) VALUES
    ('770e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', 'How would you secure a client–server multiplayer architecture in Unity using Netcode?', 'technical', 1),
    ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000', 'Explain the difference between client-side and server-side authority in multiplayer games.', 'technical', 2),
    ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440000', 'How would you handle network synchronization for a real-time multiplayer game?', 'system_design', 3),
    ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', 'Explain the React component lifecycle and when you would use useEffect.', 'technical', 1),
    ('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', 'How would you optimize a React application for performance?', 'technical', 2);

-- Insert sample responses
INSERT INTO user_responses (question_id, response_text) VALUES
    ('770e8400-e29b-41d4-a716-446655440000', 'I would implement server authority by ensuring all critical game state changes are validated on the server. This includes player positions, health, and inventory. I would use Netcode for GameObjects (NGO) with NetworkVariable for synchronized data and RPCs for client-server communication.'),
    ('770e8400-e29b-41d4-a716-446655440001', 'Client-side authority means the client makes decisions about game state, while server-side authority means the server is the source of truth. Server authority is more secure but can feel less responsive, while client authority feels more responsive but is vulnerable to cheating.'),
    ('770e8400-e29b-41d4-a716-446655440002', 'I would use a combination of techniques: state synchronization for critical data, delta compression to reduce bandwidth, client-side prediction for responsiveness, and lag compensation for fair gameplay. I would also implement rollback networking for fighting games or similar genres.');

-- Insert sample feedback
INSERT INTO session_feedback (session_id, technical_score, communication_score, problem_solving_score, strengths, weaknesses, recommendations) VALUES
    ('660e8400-e29b-41d4-a716-446655440000', 7.5, 6.5, 9.0, 
     ARRAY['Solid understanding of server authority', 'Good problem-solving approach', 'Clear explanation of trade-offs'],
     ARRAY['Missed details on synchronization strategies', 'Could improve communication clarity'],
     ARRAY['Study concurrency in Netcode', 'Practice explaining technical concepts', 'Learn about rollback networking']);
