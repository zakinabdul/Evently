import fetch from 'node-fetch';

async function testEmail() {
    console.log("Testing Registration Confirmation Email...");
    try {
        const response = await fetch('http://localhost:3001/api/email/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                registrantName: "Test User",
                registrantEmail: "zakinabdul.tech@gmail.com", // Using sender as recipient for safety/testing
                eventDetails: {
                    title: "Test Event",
                    description: "This is a test event description for debugging.",
                    start_date: "2024-12-25",
                    start_time: "10:00",
                    location: "Online",
                    event_type: "online",
                    meeting_link: "http://example.com/meet"
                },
                registrationId: "test-reg-id-123"
            })
        });

        const data = await response.json();
        console.log("Response Status:", response.status);
        console.log("Response Data:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Test Failed:", error);
    }
}

testEmail();
