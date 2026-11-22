const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const { testGemini, extractGridFromImage, suggestNextMove } = require("./gemini");
const { solveSudoku } = require("./solver");

const app = express();

const FRONTEND_DIR = path.join(__dirname, "..", "fronted");

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.static(FRONTEND_DIR));

app.get("/", (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Server AI Sudoku attivo"
    });
});

app.get("/api/test-gemini", async (req, res) => {
    try {
        const result = await testGemini();
        res.json({
            success: true,
            result
        });
    } catch (error) {
        console.error("Errore /api/test-gemini:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;
        const grid = await extractGridFromImage(image);
        res.json({
            success: true,
            grid
        });
    } catch (error) {
        console.error("Errore /api/ocr:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post("/api/hint", async (req, res) => {
    try {
        const { grid } = req.body;
        if (!Array.isArray(grid) || grid.length !== 9) {
            return res.status(400).json({
                success: false,
                error: "Matrice 9x9 non valida."
            });
        }
        const suggestion = await suggestNextMove(grid);
        res.json({
            success: true,
            ...suggestion
        });
    } catch (error) {
        console.error("Errore /api/hint:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post("/api/solve", (req, res) => {
    try {
        const { grid } = req.body;
        const solved = solveSudoku(grid);
        if (!solved) {
            return res.status(400).json({
                success: false,
                error: "Schema Sudoku non risolvibile o con numeri in conflitto."
            });
        }
        res.json({
            success: true,
            grid: solved
        });
    } catch (error) {
        console.error("Errore /api/solve:", error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});