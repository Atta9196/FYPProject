export const readingPassageSets = [
    {
        id: "academic-set-1",
        title: "Academic Set • Sustainable Futures",
        level: "academic",
        description: "Three passages exploring sustainable architecture, urban farming, and renewable transport.",
        passages: [
            {
                id: "passage-1",
                label: "Passage 1",
                title: "The Rise of Green Buildings",
                paragraphs: [
                    {
                        id: "A",
                        text: "Green buildings have shifted from experimental projects to mainstream developments. Paragraph A explores the catalysts behind this trend, noting that corporate sustainability goals and government incentives combined to accelerate adoption."
                    },
                    {
                        id: "B",
                        text: "Paragraph B focuses on the measurable benefits of green design. Certified buildings commonly reduce energy consumption by up to 30 percent, according to independent audits conducted in Europe and North America."
                    },
                    {
                        id: "C",
                        text: "Paragraph C highlights the human dimension, reporting that employees working in day-lit offices with improved ventilation reported higher satisfaction and fewer sick days."
                    }
                ],
                headingOptions: [
                    { value: "i", label: "Employee experiences in eco-friendly offices" },
                    { value: "ii", label: "Factors accelerating green building adoption" },
                    { value: "iii", label: "Quantifying savings from sustainable design" },
                    { value: "iv", label: "Obstacles to large-scale certification" }
                ]
            },
            {
                id: "passage-2",
                label: "Passage 2",
                title: "Vertical Farming in Cities",
                paragraphs: [
                    {
                        id: "A",
                        text: "Urban planners once dismissed vertical farming as unrealistic. Today, Section A reveals, high-tech greenhouses inside disused warehouses are producing leafy greens year-round."
                    },
                    {
                        id: "B",
                        text: "Section B explains that automated nutrient delivery systems allow farmers to use 90 percent less water than traditional fields while avoiding pesticides entirely."
                    },
                    {
                        id: "C",
                        text: "Section C examines the economic debate. While start-up costs remain high, collaborations between city governments and private investors are beginning to make projects viable."
                    },
                    {
                        id: "D",
                        text: "Section D projects future uses, arguing that vertical farms could bolster food security if paired with renewable energy micro-grids."
                    }
                ]
            },
            {
                id: "passage-3",
                label: "Passage 3",
                title: "Hydrogen Trains and the Future of Transport",
                paragraphs: [
                    {
                        id: "A",
                        text: "Hydrogen-fuelled trains emit only water vapour. Paragraph A recounts early trials in Germany, where regional routes replaced diesel engines with hydrogen alternatives."
                    },
                    {
                        id: "B",
                        text: "Paragraph B assesses infrastructure challenges. Producing green hydrogen requires renewable electricity, and distribution networks are still sparse."
                    },
                    {
                        id: "C",
                        text: "Paragraph C outlines potential policy responses, including subsidies for refuelling depots and public-private partnerships to commercialise the technology."
                    }
                ]
            }
        ],
        questions: [
            {
                id: "Q1",
                passageId: "passage-1",
                type: "match-heading",
                paragraphId: "A",
                prompt: "Paragraph A",
                optionsSource: "passage-1",
                answer: "ii",
                explanation: "Paragraph A emphasises the factors—policies and corporate goals—that accelerated adoption."
            },
            {
                id: "Q2",
                passageId: "passage-1",
                type: "match-heading",
                paragraphId: "B",
                prompt: "Paragraph B",
                optionsSource: "passage-1",
                answer: "iii",
                explanation: "Paragraph B provides statistics quantifying energy savings."
            },
            {
                id: "Q3",
                passageId: "passage-1",
                type: "match-heading",
                paragraphId: "C",
                prompt: "Paragraph C",
                optionsSource: "passage-1",
                answer: "i",
                explanation: "Paragraph C focuses on employee experiences and wellbeing benefits."
            },
            {
                id: "Q4",
                passageId: "passage-1",
                type: "multiple",
                prompt: "According to the passage, what helped green buildings become mainstream?",
                options: [
                    { value: "A", label: "Falling construction costs alone" },
                    { value: "B", label: "Government incentives combined with corporate goals" },
                    { value: "C", label: "International tourism demands" },
                    { value: "D", label: "Employee protests" }
                ],
                answer: "B",
                explanation: "Paragraph A states that incentives and corporate sustainability commitments accelerated adoption."
            },
            {
                id: "Q5",
                passageId: "passage-1",
                type: "true-false-ng",
                prompt: "Green buildings reduce energy usage by approximately one third.",
                answer: "true",
                explanation: "Paragraph B notes reductions of up to 30 percent."
            },
            {
                id: "Q6",
                passageId: "passage-2",
                type: "yes-no-ng",
                prompt: "The author believes vertical farms will completely replace rural agriculture.",
                answer: "not given",
                explanation: "The passage does not claim vertical farms will fully replace rural agriculture."
            },
            {
                id: "Q7",
                passageId: "passage-2",
                type: "matching-info",
                prompt: "Which section discusses reduced water usage?",
                options: [
                    { value: "A", label: "Section A" },
                    { value: "B", label: "Section B" },
                    { value: "C", label: "Section C" },
                    { value: "D", label: "Section D" }
                ],
                answer: "B",
                explanation: "Section B explains the water savings from automated systems."
            },
            {
                id: "Q8",
                passageId: "passage-2",
                type: "sentence-completion",
                prompt: "Urban vertical farms located in converted warehouses now grow ________ all year round.",
                instructions: "NO MORE THAN TWO WORDS.",
                maxWords: 2,
                answer: ["leafy greens", "leafy green"],
                explanation: "Section A highlights leafy greens being cultivated year-round."
            },
            {
                id: "Q9",
                passageId: "passage-2",
                type: "short-answer",
                prompt: "What energy source must support vertical farms to enhance food security?",
                instructions: "NO MORE THAN THREE WORDS.",
                maxWords: 3,
                answer: ["renewable energy", "renewable energy micro-grids", "renewable energy microgrids"],
                explanation: "Section D states that pairing with renewable energy micro-grids bolsters food security."
            },
            {
                id: "Q10",
                passageId: "passage-3",
                type: "summary-completion",
                prompt: "Complete the summary. Hydrogen trains emit only ________ vapour, but widespread adoption needs new ________ networks.",
                instructions: "NO MORE THAN ONE WORD IN EACH GAP.",
                parts: [
                    {
                        id: "Q10a",
                        label: "Gap 1",
                        maxWords: 1,
                        answer: ["water"],
                        explanation: "Paragraph A states hydrogen trains emit only water vapour."
                    },
                    {
                        id: "Q10b",
                        label: "Gap 2",
                        maxWords: 1,
                        answer: ["distribution", "refuelling", "infrastructure"],
                        explanation: "Paragraph B mentions the need for distribution networks."
                    }
                ]
            },
            {
                id: "Q11",
                passageId: "passage-3",
                type: "true-false-ng",
                prompt: "Germany has already replaced every diesel train with hydrogen alternatives.",
                answer: "false",
                explanation: "Paragraph A references trials on regional routes, not complete replacement."
            },
            {
                id: "Q12",
                passageId: "passage-3",
                type: "multiple",
                prompt: "What policy measure is suggested to overcome infrastructure challenges?",
                options: [
                    { value: "A", label: "Funding more diesel engines" },
                    { value: "B", label: "Subsidising refuelling depots" },
                    { value: "C", label: "Reducing renewable energy production" },
                    { value: "D", label: "Limiting public-private partnerships" }
                ],
                answer: "B",
                explanation: "Paragraph C recommends subsidies for refuelling depots."
            }
        ]
    },
    {
        id: "general-set-1",
        title: "General Training Set • Everyday Solutions",
        level: "general",
        description: "Practice with workplace notices, community announcements, and magazine extracts.",
        passages: [
            {
                id: "passage-1",
                label: "Section 1",
                title: "Company Notice: Workspace Guidelines",
                paragraphs: [
                    {
                        id: "A",
                        text: "The notice reminds staff to book meeting rooms through the intranet to avoid double bookings."
                    },
                    {
                        id: "B",
                        text: "Employees must keep desk areas free of confidential paperwork after hours."
                    }
                ]
            },
            {
                id: "passage-2",
                label: "Section 2",
                title: "Community Centre Update",
                paragraphs: [
                    {
                        id: "A",
                        text: "The centre is launching evening language courses taught by volunteer teachers."
                    },
                    {
                        id: "B",
                        text: "Free childcare will be available during Saturday workshops for parents."
                    }
                ]
            },
            {
                id: "passage-3",
                label: "Section 3",
                title: "Magazine Feature: Cycling to Work",
                paragraphs: [
                    {
                        id: "A",
                        text: "The article interviews commuters who switched from driving to cycling, citing quicker journey times in congested areas."
                    },
                    {
                        id: "B",
                        text: "A transportation analyst argues that employers should provide showers and secure bike storage."
                    }
                ]
            }
        ],
        questions: [
            {
                id: "Q1",
                passageId: "passage-1",
                type: "true-false-ng",
                prompt: "Staff can reserve meeting rooms by speaking directly to reception.",
                answer: "false",
                explanation: "The notice requires booking through the intranet."
            },
            {
                id: "Q2",
                passageId: "passage-1",
                type: "short-answer",
                prompt: "Where must employees book meeting rooms?",
                instructions: "NO MORE THAN TWO WORDS.",
                maxWords: 2,
                answer: ["the intranet", "intranet"],
                explanation: "The notice specifies the intranet booking system."
            },
            {
                id: "Q3",
                passageId: "passage-2",
                type: "yes-no-ng",
                prompt: "The community centre will charge for childcare on Saturdays.",
                answer: "no",
                explanation: "Childcare is described as free."
            },
            {
                id: "Q4",
                passageId: "passage-2",
                type: "sentence-completion",
                prompt: "Volunteer teachers will deliver evening ________ courses.",
                instructions: "ONE WORD ONLY.",
                maxWords: 1,
                answer: ["language", "languages"],
                explanation: "Evening language courses are mentioned."
            },
            {
                id: "Q5",
                passageId: "passage-3",
                type: "multiple",
                prompt: "What improvement does the analyst recommend?",
                options: [
                    { value: "A", label: "Providing free bicycles" },
                    { value: "B", label: "Building dedicated cycling lanes" },
                    { value: "C", label: "Offering showers and secure storage" },
                    { value: "D", label: "Shortening working hours" }
                ],
                answer: "C",
                explanation: "The analyst suggests facilities for cyclists."
            },
            {
                id: "Q6",
                passageId: "passage-3",
                type: "matching-info",
                prompt: "Which paragraph describes commuters saving time?",
                options: [
                    { value: "A", label: "Paragraph A" },
                    { value: "B", label: "Paragraph B" }
                ],
                answer: "A",
                explanation: "Paragraph A interviews commuters who save time."
            }
        ]
    }
];

export const readingBandTable = [
    { min: 39, band: "9" },
    { min: 37, band: "8.5" },
    { min: 35, band: "8" },
    { min: 33, band: "7.5" },
    { min: 30, band: "7" },
    { min: 27, band: "6.5" },
    { min: 23, band: "6" },
    { min: 19, band: "5.5" },
    { min: 15, band: "5" },
    { min: 12, band: "4.5" },
    { min: 9, band: "4" },
    { min: 0, band: "3.5 or below" }
];

export function getReadingSetById(setId) {
    if (!Array.isArray(readingPassageSets) || readingPassageSets.length === 0) {
        return null;
    }
    if (!setId) {
        return readingPassageSets[0];
    }
    return readingPassageSets.find((set) => set.id === setId) || readingPassageSets[0];
}

export function getRandomReadingSet(level) {
    const filtered = level ? readingPassageSets.filter((set) => set.level === level) : readingPassageSets;
    if (filtered.length === 0) return readingPassageSets[0] || null;
    return filtered[Math.floor(Math.random() * filtered.length)];
}

