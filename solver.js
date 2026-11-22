function isValidMove(grid, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if (grid[row][i] === num || grid[i][col] === num) {
            return false;
        }
    }

    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;

    for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 3; c++) {
            if (grid[r][c] === num) {
                return false;
            }
        }
    }

    return true;
}

function findEmptyCell(grid) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (grid[r][c] === 0) {
                return { row: r, col: c };
            }
        }
    }
    return null;
}

function solveSudoku(inputGrid) {
    if (!Array.isArray(inputGrid) || inputGrid.length !== 9) {
        return null;
    }

    const grid = inputGrid.map((row) => {
        if (!Array.isArray(row) || row.length !== 9) {
            throw new Error("Griglia non valida: serve una matrice 9x9");
        }
        return row.map((val) => Number(val) || 0);
    });

    function backtrack() {
        const empty = findEmptyCell(grid);
        if (!empty) {
            return true;
        }

        const { row, col } = empty;
        for (let num = 1; num <= 9; num++) {
            if (isValidMove(grid, row, col, num)) {
                grid[row][col] = num;
                if (backtrack()) {
                    return true;
                }
                grid[row][col] = 0;
            }
        }

        return false;
    }

    const solved = backtrack();
    return solved ? grid : null;
}

module.exports = {
    solveSudoku,
    isValidMove
};