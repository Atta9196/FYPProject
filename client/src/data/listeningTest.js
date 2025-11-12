export const listeningSections = [
    {
        id: 1,
        title: "Section 1 • Everyday Conversation",
        context: "Phone call about booking a seaside guesthouse",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/02/audio_b77a3e4f59.mp3?filename=airport-announcement-loop-15065.mp3",
        durationSeconds: 300,
        reviewSeconds: 30,
        questionRange: "Questions 1-10",
        questions: [
            {
                id: 1,
                type: "multiple",
                prompt: "Why is the caller phoning the guesthouse?",
                options: [
                    { value: "A", label: "To complain about a previous stay" },
                    { value: "B", label: "To make a weekend reservation" },
                    { value: "C", label: "To enquire about a job vacancy" }
                ],
                answer: "B",
                feedback: "The caller asks about booking a room for the upcoming weekend."
            },
            {
                id: 2,
                type: "fill",
                prompt: "The caller wants a room facing the ________.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["sea", "ocean"],
                maxWords: 1,
                feedback: "They request a sea view specifically."
            },
            {
                id: 3,
                type: "fill",
                prompt: "Arrival date: ________ 14th.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["july"],
                maxWords: 1,
                feedback: "The booking is for the weekend of July 14th."
            },
            {
                id: 4,
                type: "form",
                prompt: "Length of stay: ________ nights.",
                instructions: "Write ONE NUMBER.",
                answer: ["2", "two"],
                maxWords: 1,
                feedback: "They plan to stay for two nights."
            },
            {
                id: 5,
                type: "multiple",
                prompt: "Breakfast is served between:",
                options: [
                    { value: "A", label: "6:00 – 8:00" },
                    { value: "B", label: "7:30 – 9:30" },
                    { value: "C", label: "8:00 – 10:00" }
                ],
                answer: "B",
                feedback: "The receptionist confirms breakfast is from 7:30 to 9:30."
            },
            {
                id: 6,
                type: "fill",
                prompt: "The caller has dietary requirements: ________ free.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["gluten"],
                maxWords: 1,
                feedback: "They mention needing gluten-free options."
            },
            {
                id: 7,
                type: "sentence",
                prompt: "Payment will be made on ________.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["arrival", "check-in", "checkin"],
                maxWords: 1,
                feedback: "The policy is to pay when the guest arrives."
            },
            {
                id: 8,
                type: "multiple",
                prompt: "The guesthouse offers free:",
                options: [
                    { value: "A", label: "Parking" },
                    { value: "B", label: "Bicycle rental" },
                    { value: "C", label: "Airport transfers" }
                ],
                answer: "A",
                feedback: "Complimentary parking is mentioned."
            },
            {
                id: 9,
                type: "fill",
                prompt: "Deposit required: £________.",
                instructions: "Write ONE NUMBER.",
                answer: ["50", "fifty"],
                maxWords: 1,
                feedback: "A £50 deposit secures the booking."
            },
            {
                id: 10,
                type: "fill",
                prompt: "The receptionist emails a confirmation to ________@mail.com.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["lisa"],
                maxWords: 1,
                feedback: "The caller spells out her email, starting with Lisa."
            }
        ]
    },
    {
        id: 2,
        title: "Section 2 • Campus Orientation Talk",
        context: "Tour guide describes campus services to new students",
        audioUrl: "https://cdn.pixabay.com/download/audio/2021/09/14/audio_68478cf162.mp3?filename=city-ambience-6175.mp3",
        durationSeconds: 330,
        reviewSeconds: 30,
        questionRange: "Questions 11-20",
        questions: [
            {
                id: 11,
                type: "matching",
                prompt: "Match each building to the facility it houses.",
                instructions: "Write the correct letter A–C.",
                options: [
                    { value: "A", label: "Library" },
                    { value: "B", label: "Sports complex" },
                    { value: "C", label: "Student services" }
                ],
                answer: "C",
                feedback: "Building 3 contains Student Services on the first floor."
            },
            {
                id: 12,
                type: "matching",
                prompt: "Building 1 offers which facility?",
                instructions: "Write the correct letter A–C.",
                options: [
                    { value: "A", label: "Library" },
                    { value: "B", label: "Sports complex" },
                    { value: "C", label: "Student services" }
                ],
                answer: "A",
                feedback: "Building 1 is the main library."
            },
            {
                id: 13,
                type: "matching",
                prompt: "Building 2 contains which facility?",
                instructions: "Write the correct letter A–C.",
                options: [
                    { value: "A", label: "Library" },
                    { value: "B", label: "Sports complex" },
                    { value: "C", label: "Student services" }
                ],
                answer: "B",
                feedback: "Building 2 is used for sports and fitness."
            },
            {
                id: 14,
                type: "map",
                prompt: "The health centre is located in the ________ wing of the library.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["east"],
                maxWords: 1,
                feedback: "The tour guide mentions the east wing specifically."
            },
            {
                id: 15,
                type: "map",
                prompt: "The bus stop is directly opposite the ________ gate.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["north"],
                maxWords: 1,
                feedback: "The only bus stop mentioned is across from the north gate."
            },
            {
                id: 16,
                type: "multiple",
                prompt: "What time does the campus café open on weekdays?",
                options: [
                    { value: "A", label: "7:30" },
                    { value: "B", label: "8:00" },
                    { value: "C", label: "8:30" }
                ],
                answer: "B",
                feedback: "The guide says doors open at 8 a.m."
            },
            {
                id: 17,
                type: "fill",
                prompt: "Students must book the music rooms ________ days in advance.",
                instructions: "Write ONE NUMBER.",
                answer: ["3", "three"],
                maxWords: 1,
                feedback: "A three-day notice is required."
            },
            {
                id: 18,
                type: "sentence",
                prompt: "Bicycle repair services run every ________ afternoon.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["thursday"],
                maxWords: 1,
                feedback: "Weekly repair clinics are offered on Thursdays."
            },
            {
                id: 19,
                type: "fill",
                prompt: "To join the photography club, email ________@societies.ac.uk.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["photo"],
                maxWords: 1,
                feedback: "The email prefix is 'photo'."
            },
            {
                id: 20,
                type: "multiple",
                prompt: "How do students pay for laundry?",
                options: [
                    { value: "A", label: "Coins only" },
                    { value: "B", label: "Campus card" },
                    { value: "C", label: "Mobile app" }
                ],
                answer: "B",
                feedback: "Laundry machines are activated with the campus card."
            }
        ]
    },
    {
        id: 3,
        title: "Section 3 • Tutorial Discussion",
        context: "Students discuss a field research project with a tutor",
        audioUrl: "https://cdn.pixabay.com/download/audio/2023/04/28/audio_64683e565d.mp3?filename=office-background-14840.mp3",
        durationSeconds: 360,
        reviewSeconds: 30,
        questionRange: "Questions 21-30",
        questions: [
            {
                id: 21,
                type: "multiple",
                prompt: "What is the main focus of the students’ project?",
                options: [
                    { value: "A", label: "Urban noise levels" },
                    { value: "B", label: "Public transport usage" },
                    { value: "C", label: "Air quality in parks" }
                ],
                answer: "A",
                feedback: "They agree to measure changes in city noise."
            },
            {
                id: 22,
                type: "fill",
                prompt: "They plan to collect data over ________ weeks.",
                instructions: "Write ONE NUMBER.",
                answer: ["4", "four"],
                maxWords: 1,
                feedback: "The timeline is four weeks."
            },
            {
                id: 23,
                type: "sentence",
                prompt: "Recordings will be taken at the city ________.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["centre", "center"],
                maxWords: 1,
                feedback: "Measurements focus on the city centre."
            },
            {
                id: 24,
                type: "multiple",
                prompt: "Which equipment do they decide to borrow?",
                options: [
                    { value: "A", label: "Sound level meters" },
                    { value: "B", label: "Air particle monitors" },
                    { value: "C", label: "Thermal cameras" }
                ],
                answer: "A",
                feedback: "They need sound meters from the lab."
            },
            {
                id: 25,
                type: "sentence",
                prompt: "Interview volunteers will receive a small ________ voucher.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["coffee"],
                maxWords: 1,
                feedback: "Participants get a coffee voucher."
            },
            {
                id: 26,
                type: "multiple",
                prompt: "Which challenge do they anticipate?",
                options: [
                    { value: "A", label: "Finding quiet locations" },
                    { value: "B", label: "Gaining council permission" },
                    { value: "C", label: "Calibrating equipment" }
                ],
                answer: "B",
                feedback: "They worry about council approval timelines."
            },
            {
                id: 27,
                type: "fill",
                prompt: "The tutor suggests submitting the proposal by ________.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["monday"],
                maxWords: 1,
                feedback: "They agree to finalise it on Monday."
            },
            {
                id: 28,
                type: "matching",
                prompt: "Who will handle the literature review?",
                instructions: "Choose the correct person.",
                options: [
                    { value: "A", label: "Mina" },
                    { value: "B", label: "Leo" },
                    { value: "C", label: "Tutor" }
                ],
                answer: "A",
                feedback: "Mina volunteers to summarise existing research."
            },
            {
                id: 29,
                type: "matching",
                prompt: "Who is responsible for data collection?",
                instructions: "Choose the correct person.",
                options: [
                    { value: "A", label: "Mina" },
                    { value: "B", label: "Leo" },
                    { value: "C", label: "Tutor" }
                ],
                answer: "B",
                feedback: "Leo will manage the on-site recordings."
            },
            {
                id: 30,
                type: "sentence",
                prompt: "The tutor recommends presenting findings using ________ charts.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["bar"],
                maxWords: 1,
                feedback: "Bar charts are suggested for clarity."
            }
        ]
    },
    {
        id: 4,
        title: "Section 4 • Academic Lecture",
        context: "Public lecture on coral reef conservation strategies",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/12/19/audio_0a51f9e756.mp3?filename=ambient-piano-choir-129235.mp3",
        durationSeconds: 360,
        reviewSeconds: 30,
        questionRange: "Questions 31-40",
        questions: [
            {
                id: 31,
                type: "multiple",
                prompt: "What is cited as the biggest threat to reefs?",
                options: [
                    { value: "A", label: "Tourism" },
                    { value: "B", label: "Rising sea temperatures" },
                    { value: "C", label: "Sediment runoff" }
                ],
                answer: "B",
                feedback: "Thermal stress is identified as the key threat."
            },
            {
                id: 32,
                type: "sentence",
                prompt: "Coral bleaching occurs when algae called ________ leave the coral tissue.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["zooxanthellae"],
                maxWords: 1,
                feedback: "Zooxanthellae provide nutrients to corals."
            },
            {
                id: 33,
                type: "fill",
                prompt: "The speaker emphasises the need for marine ________ areas.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["protected"],
                maxWords: 1,
                feedback: "Marine protected areas help reefs recover."
            },
            {
                id: 34,
                type: "multiple",
                prompt: "Which strategy is described as low-cost and community-led?",
                options: [
                    { value: "A", label: "Artificial reefs" },
                    { value: "B", label: "Restoring mangroves" },
                    { value: "C", label: "Relocating coral colonies" }
                ],
                answer: "B",
                feedback: "Mangrove restoration is presented as community-driven."
            },
            {
                id: 35,
                type: "sentence",
                prompt: "The lecture mentions coral nurseries growing fragments on ________ lines.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["rope", "ropes"],
                maxWords: 1,
                feedback: "Rope lines are used to suspend coral fragments."
            },
            {
                id: 36,
                type: "multiple",
                prompt: "What role do parrotfish play?",
                options: [
                    { value: "A", label: "Control algae growth" },
                    { value: "B", label: "Provide shade" },
                    { value: "C", label: "Transport coral larvae" }
                ],
                answer: "A",
                feedback: "Parrotfish graze on algae, preventing overgrowth."
            },
            {
                id: 37,
                type: "sentence",
                prompt: "Rapid coral growth can occur after ________ disturbances.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["cyclone", "cyclones", "storms"],
                maxWords: 1,
                feedback: "The lecturer gives examples of post-cyclone recovery."
            },
            {
                id: 38,
                type: "sentence",
                prompt: "The presenter urges reducing coastal ________ pollution.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["nutrient", "nutrients"],
                maxWords: 1,
                feedback: "Nutrient pollution fuels algae blooms harmful to reefs."
            },
            {
                id: 39,
                type: "fill",
                prompt: "Monitoring programmes now use underwater ________ to track reef health.",
                instructions: "Write ONE WORD ONLY.",
                answer: ["drones"],
                maxWords: 1,
                feedback: "Drones are highlighted as a modern monitoring tool."
            },
            {
                id: 40,
                type: "sentence",
                prompt: "The speaker ends by calling reefs the \"________ of the sea.\"",
                instructions: "Write ONE WORD ONLY.",
                answer: ["rainforests", "rainforest"],
                maxWords: 1,
                feedback: "Reefs are likened to rainforests for biodiversity."
            }
        ]
    }
];

export const totalListeningQuestions = listeningSections.reduce((sum, section) => sum + section.questions.length, 0);

