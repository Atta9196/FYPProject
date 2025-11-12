const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function evaluateWritingSubmission(payload) {
    const response = await fetch(`${API_BASE_URL}/api/writing/evaluate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    let data = null;
    try {
        data = await response.json();
    } catch (error) {
        throw new Error("Failed to parse evaluation response.");
    }

    if (!response.ok) {
        throw new Error(data?.error || "Failed to evaluate writing submission.");
    }

    return data;
}

