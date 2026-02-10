export const createCalendarEvent = async (taskItem) => {
    const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(token);
            }
        });
    });

    const event = {
        'summary': taskItem.task,
        'description': `Assigned to: ${taskItem.owner}`,
        'start': {
            'date': taskItem.deadline // Assuming YYYY-MM-DD format
        },
        'end': {
            'date': taskItem.deadline
        },
        'reminders': {
            'useDefault': false,
            'overrides': [
                { 'method': 'popup', 'minutes': 24 * 60 }
            ]
        }
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Calendar event creation failed');
    }

    return await response.json();
};
