-- Subscription Plans Seed Data
-- Insert sample subscription plans

INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, max_sessions_per_month, max_session_duration, stripe_price_id_monthly, stripe_price_id_yearly) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'Free',
    'Perfect for getting started with mock interviews',
    0.00,
    0.00,
    '{
        "features": [
            "3 mock interviews per month",
            "Basic feedback",
            "Standard question types",
            "15-minute sessions"
        ],
        "limitations": [
            "Limited to 3 sessions per month",
            "Basic feedback only",
            "No audio recording"
        ]
    }',
    3,
    15,
    NULL,
    NULL
),
(
    '00000000-0000-0000-0000-000000000002',
    'Starter',
    'Great for regular practice and improvement',
    19.99,
    199.99,
    '{
        "features": [
            "10 mock interviews per month",
            "Detailed feedback with scores",
            "All question types",
            "30-minute sessions",
            "Audio recording",
            "Progress tracking"
        ],
        "limitations": [
            "Limited to 10 sessions per month"
        ]
    }',
    10,
    30,
    'price_starter_monthly',
    'price_starter_yearly'
),
(
    '00000000-0000-0000-0000-000000000003',
    'Professional',
    'For serious interview preparation',
    39.99,
    399.99,
    '{
        "features": [
            "Unlimited mock interviews",
            "Advanced AI feedback",
            "All question types",
            "60-minute deep dive sessions",
            "Audio recording & transcription",
            "Detailed progress analytics",
            "Custom interview scenarios",
            "Priority support"
        ],
        "limitations": []
    }',
    0, -- 0 means unlimited
    60,
    'price_professional_monthly',
    'price_professional_yearly'
),
(
    '00000000-0000-0000-0000-000000000004',
    'Enterprise',
    'For teams and organizations',
    99.99,
    999.99,
    '{
        "features": [
            "Everything in Professional",
            "Team management",
            "Custom branding",
            "API access",
            "Dedicated support",
            "Custom interview templates",
            "Advanced analytics dashboard",
            "White-label solution"
        ],
        "limitations": []
    }',
    0, -- 0 means unlimited
    60,
    'price_enterprise_monthly',
    'price_enterprise_yearly'
);

-- Set default free plan for existing users (if any)
-- This would be handled by the application logic when users are created
