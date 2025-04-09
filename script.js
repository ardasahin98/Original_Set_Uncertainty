let cachedQuestions = [];
let responses = {};
let researcherResponses = {}; // Stores values from researcher_responses.json

async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        cachedQuestions = await response.json();

        const resFile = await fetch('researcher_responses.json');
        researcherResponses = await resFile.json();

        renderPage(-1);
    } catch (error) {
        console.error("Failed to load files:", error);
    }
}

function renderPage(index) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));

    if (index === -1) {
        document.getElementById('page-1').classList.add('active');
        return;
    }

    if (index === -2) {
        document.getElementById('last_page').classList.add('active');
        return;
    }

    const question = cachedQuestions[index];
    const container = document.getElementById('quiz-container');
    container.querySelector('.dynamic-question')?.remove();

    const savedBehavior = responses[question.questionNumber]?.behavior || "";
    const savedComments = responses[question.questionNumber]?.comments || "";
    const savedSliderValue = responses[question.questionNumber]?.sliderValue || 50;

    const questionDiv = document.createElement('div');
    questionDiv.className = 'page active dynamic-question';

    questionDiv.innerHTML = `
        <div class="question-header">
            <h2>Question ${question.questionNumber}/64</h2>
        </div>
        <div class="navigation-buttons" style="margin-top:-10px">
            <button onclick="saveAnswer(${question.questionNumber}); navigatePage(${index - 1})" ${index === 0 ? 'disabled' : ''}>Back</button>
            <button onclick="saveAnswer(${question.questionNumber}); ${index === cachedQuestions.length - 1 ? 'navigatePage(-2)' : `navigatePage(${index + 1})`}">Next</button>
        </div>
        <div style="justify-items:center">
            <table class="image-table" style="width:1100px">
                <thead>
                    <tr><th>Last Cycle</th><th>3% Strain Cycle</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td><img width="200px" height="200px" src="${question.lastCycleImage}" alt="Last Cycle Image"></td>
                        <td><img width="200px" height="200px" src="${question.strainCycleImage}" alt="3% Strain Cycle Image"></td>
                    </tr>
                    <tr>
                        <td colspan="2" style="text-align: center;">
                            <div><b>Number of Cycles:</b> ${question.cycleNumber}</div>
                            <div id="researcher-response-value" 
                                style="margin: 10px auto; 
                                        font-weight: bold; 
                                        border: 0.1rem solid black; 
                                        background-color: white; 
                                        padding: 10px; 
                                        width: 500px; 
                                        display: flex; 
                                        flex-direction: column; 
                                        justify-content: center; 
                                        align-items: center; 
                                        text-align: center;">
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div style="display:flex; margin-top:-40px">
            <div class="multiple-choice" style="padding-left:20%">
                <div class="response-display" id="response-display-${question.questionNumber}" style="margin-bottom: 10px; font-weight: bold; color: #444;"></div>
                <p>Please estimate the Std. Dev.:</p>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <label>(0)</label>
                    <input type="range" id="slider_${question.questionNumber}" min="0" max="100" step="1" value="${savedSliderValue}">
                    <label>Std. Dev (100)</label>
                </div>
                <p>Current Value: 
                    <input type="number" id="slider_input_${question.questionNumber}" value="${savedSliderValue}" min="0" max="100" style="width: 60px;">
                </p>
            </div>
            <div class="comments-section" style="padding-left:10%; width:400px">
                <h3>Comments</h3>
                <textarea id="comments_${question.questionNumber}" rows="5" placeholder="Enter your comments here...">${savedComments}</textarea>
            </div>
        </div>
        <div class="navigation-buttons" style="margin-top:-10px">
            <button onclick="saveAnswer(${question.questionNumber}); navigatePage(${index - 1})" ${index === 0 ? 'disabled' : ''}>Back</button>
            <button onclick="saveAnswer(${question.questionNumber}); ${index === cachedQuestions.length - 1 ? 'navigatePage(-2)' : `navigatePage(${index + 1})`}">Next</button>
        </div>
    `;

    container.appendChild(questionDiv);

    const slider = document.getElementById(`slider_${question.questionNumber}`);
    const sliderInput = document.getElementById(`slider_input_${question.questionNumber}`);

    slider.addEventListener('input', () => {
        sliderInput.value = slider.value;
        saveAnswer(question.questionNumber);
    });

    sliderInput.addEventListener('input', () => {
        slider.value = sliderInput.value;
        saveAnswer(question.questionNumber);
    });

    // Live researcher selection
    document.getElementById("researcher-name").addEventListener("change", () => {
        saveAnswer(question.questionNumber);
        updateResearcherValueDisplay(question.questionNumber);
    });

    // Show the value from JSON near Number of Cycles
    updateResearcherValueDisplay(question.questionNumber);
}

function saveAnswer(questionNumber) {
    const slider = document.getElementById(`slider_${question.questionNumber}`);
    const commentInput = document.getElementById(`comments_${question.questionNumber}`);
    const researcherName = document.getElementById("researcher-name").value.trim();

    if (!responses[questionNumber]) {
        responses[questionNumber] = {};
    }

    responses[questionNumber].behavior = slider ? slider.value : "";
    responses[questionNumber].sliderValue = slider ? slider.value : "";
    responses[questionNumber].comments = commentInput ? commentInput.value.trim() : "";

    const researcherValue = researcherResponses[questionNumber]?.[researcherName];
    const finalValue = researcherValue ?? responses[questionNumber].behavior;
    responses[questionNumber].displayText = `Your response was: ${researcherName} - Question ${questionNumber} - ${finalValue}`;
}

function submitForm() {
    const researcherNameInput = document.getElementById("researcher-name");
    const researcherName = researcherNameInput ? researcherNameInput.value.trim() : "Researcher";
    const data = [];

    data.push({
        Question: "Researcher Name",
        Answer: researcherName
    });

    Object.keys(responses).forEach(questionNumber => {
        const response = responses[questionNumber];
        if (response.behavior || response.comments) {
            data.push({
                Question: `Question_Number_${questionNumber}_Std_Dev`,
                Answer: response.behavior || "No selection",
            });
            data.push({
                Question: `Question_Number_${questionNumber}_Std_Dev_Comments`,
                Answer: response.comments || "No comments",
            });
        }
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");

    const fileName = `${researcherName.replace(/ /g, "_")}_Responses.xlsx`;
    XLSX.writeFile(workbook, fileName);

    alert("Your answers have been saved to an Excel file!");
}

function navigatePage(index) {
    console.log(`Navigating to index: ${index}`);
    if (index >= 0 && index < cachedQuestions.length) {
        renderPage(index);
    } else if (index === -1) {
        renderPage(-1);
    } else if (index === -2) {
        renderPage(-2);
    } else {
        console.error(`Invalid navigation request. Index: ${index}`);
    }
}

function updateResearcherValueDisplay(questionNumber) {
    const researcherName = document.getElementById("researcher-name").value.trim();
    const value = researcherResponses[questionNumber]?.[researcherName];

    const span = document.getElementById("researcher-response-value");
    if (span && value !== undefined) {
        span.innerHTML = `
        <div style="font-size: 1.5em; font-weight: bold;">Your Response was: ${value}</div>
        <div style="font-size: 0.9em; color: #666;">(Clay-like: 100, Sand-like: 0)</div>
    `;
    } else if (span) {
        span.innerHTML = "";
    }
}

document.addEventListener('DOMContentLoaded', loadQuestions);