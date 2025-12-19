'use client';

import { useEffect, useRef, useState } from 'react';

// Tetromino shapes
const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]]
};

const COLORS = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000'
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30;

export default function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState({
    score: 0,
    level: 1,
    lines: 0,
    gameOver: false,
    paused: false
  });
  const [isMobile, setIsMobile] = useState(false);

  const gameRef = useRef({
    board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)) as (number | string)[][],
    currentPiece: null as any,
    currentX: 0,
    currentY: 0,
    dropCounter: 0,
    dropInterval: 1000,
    lastTime: 0
  });

  useEffect(() => {
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

  const getRandomPiece = () => {
    const shapes = Object.keys(SHAPES);
    const shape = shapes[Math.floor(Math.random() * shapes.length)] as keyof typeof SHAPES;
    return {
      shape: SHAPES[shape],
      color: COLORS[shape],
      type: shape
    };
  };

  const collision = (board: (number | string)[][], piece: number[][], x: number, y: number) => {
    for (let row = 0; row < piece.length; row++) {
      for (let col = 0; col < piece[row].length; col++) {
        if (piece[row][col]) {
          const newX = x + col;
          const newY = y + row;
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true;
          }
          if (newY >= 0 && board[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const merge = (board: (number | string)[][], piece: number[][], x: number, y: number, color: string) => {
    const newBoard = board.map(row => [...row]);
    for (let row = 0; row < piece.length; row++) {
      for (let col = 0; col < piece[row].length; col++) {
        if (piece[row][col]) {
          const newY = y + row;
          const newX = x + col;
          if (newY >= 0) {
            newBoard[newY][newX] = color;
          }
        }
      }
    }
    return newBoard;
  };

  const clearLines = (board: (number | string)[][]) => {
    let linesCleared = 0;
    const newBoard = board.filter(row => {
      if (row.every(cell => cell !== 0)) {
        linesCleared++;
        return false;
      }
      return true;
    });

    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }

    return { newBoard, linesCleared };
  };

  const rotate = (piece: number[][]) => {
    const rotated = piece[0].map((_, i) => piece.map(row => row[i]).reverse());
    return rotated;
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const game = gameRef.current;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, BOARD_WIDTH * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE);

    // Draw grid
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }

    // Draw board
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (game.board[y][x]) {
          ctx.fillStyle = game.board[y][x] as string;
          ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          
          // Add shine effect
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE / 3);
        }
      }
    }

    // Draw current piece
    if (game.currentPiece) {
      ctx.fillStyle = game.currentPiece.color;
      for (let row = 0; row < game.currentPiece.shape.length; row++) {
        for (let col = 0; col < game.currentPiece.shape[row].length; col++) {
          if (game.currentPiece.shape[row][col]) {
            const x = (game.currentX + col) * BLOCK_SIZE;
            const y = (game.currentY + row) * BLOCK_SIZE;
            ctx.fillRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            
            // Add shine effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE / 3);
            ctx.fillStyle = game.currentPiece.color;
          }
        }
      }
    }
  };

  const spawnPiece = () => {
    const game = gameRef.current;
    game.currentPiece = getRandomPiece();
    game.currentX = Math.floor(BOARD_WIDTH / 2) - Math.floor(game.currentPiece.shape[0].length / 2);
    game.currentY = 0;

    if (collision(game.board, game.currentPiece.shape, game.currentX, game.currentY)) {
      setGameState(prev => ({ ...prev, gameOver: true }));
      return false;
    }
    return true;
  };

  const drop = () => {
    const game = gameRef.current;
    if (!game.currentPiece) return;

    game.currentY++;
    if (collision(game.board, game.currentPiece.shape, game.currentX, game.currentY)) {
      game.currentY--;
      game.board = merge(game.board, game.currentPiece.shape, game.currentX, game.currentY, game.currentPiece.color);
      
      const { newBoard, linesCleared } = clearLines(game.board);
      game.board = newBoard;

      if (linesCleared > 0) {
        const points = [0, 100, 300, 500, 800][linesCleared];
        setGameState(prev => {
          const newLines = prev.lines + linesCleared;
          const newLevel = Math.floor(newLines / 10) + 1;
          game.dropInterval = Math.max(100, 1000 - (newLevel - 1) * 100);
          return {
            ...prev,
            score: prev.score + points * prev.level,
            lines: newLines,
            level: newLevel
          };
        });
      }

      spawnPiece();
    }
  };

  const hardDrop = () => {
    const game = gameRef.current;
    if (!game.currentPiece) return;

    while (!collision(game.board, game.currentPiece.shape, game.currentX, game.currentY + 1)) {
      game.currentY++;
    }
    drop();
  };

  const move = (dir: number) => {
    const game = gameRef.current;
    if (!game.currentPiece) return;

    game.currentX += dir;
    if (collision(game.board, game.currentPiece.shape, game.currentX, game.currentY)) {
      game.currentX -= dir;
    }
  };

  const rotatePiece = () => {
    const game = gameRef.current;
    if (!game.currentPiece) return;

    const rotated = rotate(game.currentPiece.shape);
    const originalX = game.currentX;

    if (!collision(game.board, rotated, game.currentX, game.currentY)) {
      game.currentPiece.shape = rotated;
    } else {
      // Wall kick
      game.currentX++;
      if (!collision(game.board, rotated, game.currentX, game.currentY)) {
        game.currentPiece.shape = rotated;
      } else {
        game.currentX = originalX - 1;
        if (!collision(game.board, rotated, game.currentX, game.currentY)) {
          game.currentPiece.shape = rotated;
        } else {
          game.currentX = originalX;
        }
      }
    }
  };

  const update = (time = 0) => {
    const game = gameRef.current;
    if (gameState.gameOver || gameState.paused) return;

    const deltaTime = time - game.lastTime;
    game.lastTime = time;
    game.dropCounter += deltaTime;

    if (game.dropCounter > game.dropInterval) {
      drop();
      game.dropCounter = 0;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        draw(ctx);
      }
    }

    requestAnimationFrame(update);
  };

  const startGame = () => {
    const game = gameRef.current;
    game.board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)) as (number | string)[][];
    setGameState({ score: 0, level: 1, lines: 0, gameOver: false, paused: false });
    game.dropInterval = 1000;
    spawnPiece();
    requestAnimationFrame(update);
  };

  const togglePause = () => {
    setGameState(prev => ({ ...prev, paused: !prev.paused }));
    if (gameState.paused) {
      requestAnimationFrame(update);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.gameOver) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          move(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          move(1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          drop();
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotatePiece();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.gameOver, gameState.paused]);

  useEffect(() => {
    startGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4 overflow-hidden">
      <div className="flex flex-col items-center gap-4 max-w-full">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">TETRIS</h1>
          <div className="flex gap-6 justify-center text-white">
            <div className="text-center">
              <div className="text-xs text-gray-400">SCORE</div>
              <div className="text-xl font-bold">{gameState.score}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">LEVEL</div>
              <div className="text-xl font-bold">{gameState.level}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">LINES</div>
              <div className="text-xl font-bold">{gameState.lines}</div>
            </div>
          </div>
        </div>

        {/* Game Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={BOARD_WIDTH * BLOCK_SIZE}
            height={BOARD_HEIGHT * BLOCK_SIZE}
            className="border-4 border-purple-500 rounded-lg shadow-2xl bg-black"
          />
          
          {/* Overlays */}
          {gameState.gameOver && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-4">GAME OVER</h2>
                <p className="text-xl text-gray-300 mb-6">Score: {gameState.score}</p>
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
                >
                  PLAY AGAIN
                </button>
              </div>
            </div>
          )}

          {gameState.paused && !gameState.gameOver && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-4">PAUSED</h2>
                <button
                  onClick={togglePause}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
                >
                  RESUME
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="text-center text-white text-sm">
          <p className="mb-2">Desktop: Arrow Keys to move, Space to drop, P to pause</p>
        </div>

        {/* Mobile Controls */}
        {isMobile && (
          <div className="flex gap-3 mt-2">
            <button
              onTouchStart={(e) => { e.preventDefault(); move(-1); }}
              className="px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg active:bg-purple-800 touch-none"
            >
              ←
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); rotatePiece(); }}
              className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg active:bg-blue-800 touch-none"
            >
              ↻
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); drop(); }}
              className="px-6 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg active:bg-green-800 touch-none"
            >
              ↓
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); move(1); }}
              className="px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg active:bg-purple-800 touch-none"
            >
              →
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); hardDrop(); }}
              className="px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg active:bg-red-800 touch-none"
            >
              DROP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}








