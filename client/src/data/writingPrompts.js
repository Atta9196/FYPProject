export const writingTaskConfigs = {
    "task1-academic": {
        id: "task1-academic",
        label: "Task 1 • Academic",
        description: "Summarise and compare key features of the visual information in at least 150 words.",
        minWords: 150,
        durationSeconds: 20 * 60,
        category: "Academic Task 1",
        allowCopyPaste: false
    },
    "task1-general": {
        id: "task1-general",
        label: "Task 1 • General Training",
        description: "Write a letter responding to the given situation in at least 150 words.",
        minWords: 150,
        durationSeconds: 20 * 60,
        category: "General Training Task 1",
        allowCopyPaste: false
    },
    "task2-essay": {
        id: "task2-essay",
        label: "Task 2 • Essay",
        description: "Write an essay of at least 250 words responding to the prompt.",
        minWords: 250,
        durationSeconds: 40 * 60,
        category: "Task 2 Essay",
        allowCopyPaste: false
    }
};

export const academicTask1Prompts = [
    {
        id: "ac-task1-graphs",
        title: "Line Graph Comparison",
        visualType: "Line Graph",
        prompt: "The line graph below shows the percentage of households with access to the internet in five countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
        questionType: "Trend analysis",
        bandTips: [
            "Group countries that follow similar trends rather than describing each year individually.",
            "Highlight peaks, dips, and noteworthy changes over time."
        ]
    },
    {
        id: "ac-task1-process",
        title: "Process Diagram — Recycling",
        visualType: "Process Diagram",
        prompt: "The diagram illustrates how plastic bottles are recycled into new products. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
        questionType: "Process description",
        bandTips: [
            "Use passive voice to describe production stages.",
            "Notice cyclical nature and include starting/ending points."
        ]
    },
    {
        id: "ac-task1-table",
        title: "Population Table",
        visualType: "Table",
        prompt: "The table shows the population (in millions) of six major cities in 1990, 2010 and projected figures for 2030. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
        questionType: "Comparison",
        bandTips: [
            "Highlight overall growth and rank cities by size.",
            "Mention the most significant increases or decreases."
        ]
    }
];

export const generalTask1Prompts = [
    {
        id: "gt-task1-formal",
        title: "Formal Letter — Conference",
        tone: "Formal",
        prompt: "You recently attended a professional conference overseas and have misplaced a personal item. Write a letter to the conference organiser. In your letter, describe the item, explain where and when you think you lost it, and request assistance in finding it.",
        questionType: "Request assistance",
        bandTips: [
            "Use a formal salutation and sign-off (e.g., 'Dear Sir or Madam', 'Yours faithfully').",
            "Maintain a polite tone and provide clear, specific details."
        ]
    },
    {
        id: "gt-task1-semi",
        title: "Semi-formal Letter — Community Event",
        tone: "Semi-formal",
        prompt: "You want to organise a cultural evening for your local community. Write a letter to the community centre manager. In your letter, introduce the event, suggest a suitable date and time, and explain what facilities you would need.",
        questionType: "Proposal",
        bandTips: [
            "Balance polite language with a friendly tone.",
            "Outline the benefits for the community."
        ]
    },
    {
        id: "gt-task1-informal",
        title: "Informal Letter — House-sitting",
        tone: "Informal",
        prompt: "You are going on holiday and need a friend to house-sit for you. Write a letter to your friend. In your letter, explain when and where you are going, tell them what tasks to take care of in your house, and describe what you will do to thank them.",
        questionType: "Informal request",
        bandTips: [
            "Use a friendly greeting and contractions.",
            "Explain why you trust them with the house."
        ]
    }
];

export const task2EssayPrompts = [
    {
        id: "task2-opinion-1",
        title: "Opinion — Remote Work",
        questionType: "Opinion (Agree / Disagree)",
        prompt: "Some people believe that working from home is better for employees and companies, while others feel it reduces productivity and collaboration. To what extent do you agree or disagree?",
        bandTips: [
            "State a clear position in the introduction and maintain it throughout.",
            "Support arguments with relevant examples."
        ]
    },
    {
        id: "task2-discussion-1",
        title: "Discussion — Education",
        questionType: "Discussion (Both Views)",
        prompt: "Some people think students should study the science subjects only, while others believe they should study what interests them. Discuss both views and give your own opinion.",
        bandTips: [
            "Provide balanced coverage of both viewpoints.",
            "Include your opinion clearly, either in conclusion or throughout."
        ]
    },
    {
        id: "task2-problem-1",
        title: "Problem & Solution — Urban Transport",
        questionType: "Problem & Solution",
        prompt: "Traffic congestion has become a serious problem in many cities worldwide. What are the main causes of this issue, and what solutions can you suggest?",
        bandTips: [
            "Describe causes and solutions with logical links.",
            "Use problem-solution paragraphs for clarity."
        ]
    },
    {
        id: "task2-advantages-1",
        title: "Advantages vs Disadvantages — Tourism",
        questionType: "Advantages & Disadvantages",
        prompt: "Tourism brings many economic benefits, but it can also cause environmental and social problems. Do the advantages of tourism outweigh the disadvantages?",
        bandTips: [
            "Weigh pros and cons with clear argumentation.",
            "Use a thesis that shows overall judgement."
        ]
    },
    {
        id: "task2-double-1",
        title: "Double Question — Technology & Society",
        questionType: "Double Question",
        prompt: "Technology has changed the way we interact with each other. How has technology affected personal relationships today, and is this a positive or negative development?",
        bandTips: [
            "Answer both questions fully.",
            "Provide examples showing positive and negative effects."
        ]
    }
];

export function getRandomPrompt(taskId) {
    switch (taskId) {
        case "task1-academic":
            return academicTask1Prompts[Math.floor(Math.random() * academicTask1Prompts.length)];
        case "task1-general":
            return generalTask1Prompts[Math.floor(Math.random() * generalTask1Prompts.length)];
        case "task2-essay":
            return task2EssayPrompts[Math.floor(Math.random() * task2EssayPrompts.length)];
        default:
            return null;
    }
}

