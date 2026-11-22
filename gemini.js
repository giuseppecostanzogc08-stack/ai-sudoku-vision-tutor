const { GoogleGenAI, Type } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.8-flash";

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callWithRetry(fn, maxTentativi = 3) {
    for (let tentativo = 1; tentativo <= maxTentativi; tentativo++) {
        try {
            return await fn();
        } catch (error) {
            const is503 = error && (error.status === 503 || String(error.message || "").includes("503"));
            if (!is503 || tentativo === maxTentativi) {
                throw error;
            }
            const attesaMs = tentativo * 1500;
            console.log(`Gemini temporaneamente sovraccarico (503), riprovo tra ${attesaMs}ms (${tentativo}/${maxTentativi})...`);
            await sleep(attesaMs);
        }
    }
}

function parseDataUrl(base64OrDataUrl) {
    if (typeof base64OrDataUrl !== "string" || !base64OrDataUrl.trim()) {
        throw new Error("Immagine mancante o non valida.");
    }
    const match = base64OrDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (match) {
        return { mimeType: match[1], data: match[2] };
    }
    return { mimeType: "image/jpeg", data: base64OrDataUrl.trim() };
}

async function testGemini() {
    const response = await callWithRetry(() =>
        ai.models.generateContent({
            model: MODEL_NAME,
            contents: "Scrivi solamente: Gemini collegato correttamente"
        })
    );
    return response.text;
}

async function extractGridFromImage(base64OrDataUrl) {
    const { mimeType, data } = parseDataUrl(base64OrDataUrl);

    const prompt = [
        "Analizza l'immagine del Sudoku fornita. Estrai i numeri presenti e la loro posizione.",
        "Restituisci un oggetto JSON con il campo 'grid': un array 9x9 dove 0 rappresenta una cella vuota e i numeri da 1 a 9 rappresentano le cifre presenti nella foto."
    ].join(" ");

    const response = await callWithRetry(() =>
        ai.models.generateContent({
            model: MODEL_NAME,
            contents: [
                {
                    inlineData: {
                        mimeType,
                        data
                    }
                },
                prompt
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        grid: {
                            type: Type.ARRAY,
                            description: "Matrice 9x9 del Sudoku: 0 per celle vuote, 1-9 per cifre lette.",
                            items: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.INTEGER
                                }
                            }
                        }
                    },
                    required: ["grid"]
                }
            }
        })
    );

    const parsed = JSON.parse(response.text);
    if (!Array.isArray(parsed.grid) || parsed.grid.length !== 9) {
        throw new Error("La risposta OCR non contiene una griglia 9x9 valida.");
    }
    return parsed.grid;
}

async function suggestNextMove(grid) {
    const prompt = [
        `Data la seguente matrice Sudoku 9x9 incompleta: ${JSON.stringify(grid)}.`,
        "Trova LA PROSSIMA mossa più facile ed evidente da compiere.",
        "Restituisci un JSON con la seguente struttura: { \"row\": int (0-8), \"col\": int (0-8), \"valore\": int (1-9), \"spiegazione\": \"Stringa con la motivazione logica in italiano\" }."
    ].join(" ");

    const response = await callWithRetry(() =>
        ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        row: { type: Type.INTEGER, description: "Indice riga da 0 a 8" },
                        col: { type: Type.INTEGER, description: "Indice colonna da 0 a 8" },
                        valore: { type: Type.INTEGER, description: "Cifra da 1 a 9" },
                        spiegazione: { type: Type.STRING, description: "Motivazione logica in italiano" }
                    },
                    required: ["row", "col", "valore", "spiegazione"]
                }
            }
        })
    );

    return JSON.parse(response.text);
}

module.exports = {
    testGemini,
    extractGridFromImage,
    suggestNextMove
};
