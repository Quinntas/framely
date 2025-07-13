'use client'

import {useEffect, useState, useRef, useCallback} from 'react'
import {motion, AnimatePresence} from 'framer-motion'
import {Button} from '@/components/ui/button'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {Label} from '@/components/ui/label'
import {Input} from '@/components/ui/input'
import {Separator} from '@/components/ui/separator'
import {Badge} from '@/components/ui/badge'
import {ScrollArea} from '@/components/ui/scroll-area'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from '@/components/ui/resizable'
import {ArrowLeft, Download, Palette, RefreshCw, Save, Trash2, Undo, Redo, Keyboard, Upload, FileDown, FileUp, Send} from 'lucide-react'
import {ModeToggle} from '@/components/mode-toggle'
import {toast} from 'sonner'
import Link from 'next/link'
import {useRouter, useSearchParams} from 'next/navigation'
import {getAnimationForEditor, saveAnimationFromEditor, type PixelArtAnimation} from '../actions'

interface Pixel {
    x: number
    y: number
    color: string
}

interface GridState {
    width: number
    height: number
    pixels: Pixel[]
}

interface HistoryState {
    pixels: Pixel[]
    timestamp: number
}

interface KeyBinding {
    action: string
    key: string
    ctrlKey?: boolean
    shiftKey?: boolean
    altKey?: boolean
}

export default function PixelArtEditor() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const animationId = searchParams.get('animationId')
    
    const [gridSize, setGridSize] = useState<'8x8' | '16x16' | '32x32' | 'custom'>('16x16')
    const [customWidth, setCustomWidth] = useState(16)
    const [customHeight, setCustomHeight] = useState(16)
    const [selectedColor, setSelectedColor] = useState('#000000')
    const [isDrawing, setIsDrawing] = useState(false)
    const [isErasing, setIsErasing] = useState(false)
    const [currentAnimation, setCurrentAnimation] = useState<PixelArtAnimation | null>(null)
    const [animationName, setAnimationName] = useState('')
    const [grid, setGrid] = useState<GridState>({
        width: 16,
        height: 16,
        pixels: []
    })
    const [history, setHistory] = useState<HistoryState[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)
    const [colorPalette, setColorPalette] = useState<string[]>([
        '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
        '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#c0c0c0', '#808080'
    ])
    
    const [keyBindings, setKeyBindings] = useState<KeyBinding[]>([
        { action: 'undo', key: 'z', ctrlKey: true },
        { action: 'redo', key: 'y', ctrlKey: true },
        { action: 'toggleTool', key: 'e' },
        { action: 'clearCanvas', key: 'c', ctrlKey: true, shiftKey: true },
        { action: 'exportImage', key: 's', ctrlKey: true },
        { action: 'paint', key: 'p' },
        { action: 'erase', key: 'x' }
    ])
    
    const [showKeyBindingsDialog, setShowKeyBindingsDialog] = useState(false)
    const [editingBinding, setEditingBinding] = useState<KeyBinding | null>(null)
    
    const canvasRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const paletteInputRef = useRef<HTMLInputElement>(null)
    const [cellSize, setCellSize] = useState(20)

    useEffect(() => {
        const newGrid = getGridDimensions()
        setGrid({
            width: newGrid.width,
            height: newGrid.height,
            pixels: []
        })
        saveToHistory([])
    }, [gridSize, customWidth, customHeight])

    useEffect(() => {
        // Adjust cell size based on grid size for better visibility
        const newGrid = getGridDimensions()
        const maxSize = Math.min(600 / newGrid.width, 600 / newGrid.height)
        setCellSize(Math.max(8, Math.min(30, maxSize)))
    }, [gridSize, customWidth, customHeight])

    const getGridDimensions = () => {
        switch (gridSize) {
            case '8x8':
                return {width: 8, height: 8}
            case '16x16':
                return {width: 16, height: 16}
            case '32x32':
                return {width: 32, height: 32}
            case 'custom':
                return {width: customWidth, height: customHeight}
        }
    }

    const saveToHistory = (pixels: Pixel[]) => {
        const newHistory = [...history.slice(0, historyIndex + 1), {
            pixels: [...pixels],
            timestamp: Date.now()
        }]
        setHistory(newHistory)
        setHistoryIndex(newHistory.length - 1)
    }

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1)
            setGrid(prev => ({
                ...prev,
                pixels: [...history[historyIndex - 1].pixels]
            }))
        }
    }

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1)
            setGrid(prev => ({
                ...prev,
                pixels: [...history[historyIndex + 1].pixels]
            }))
        }
    }

    const getPixelColor = (x: number, y: number) => {
        const pixel = grid.pixels.find(p => p.x === x && p.y === y)
        return pixel ? pixel.color : 'transparent'
    }

    const paintPixel = (x: number, y: number) => {
        if (isErasing) {
            const newPixels = grid.pixels.filter(p => !(p.x === x && p.y === y))
            setGrid(prev => ({...prev, pixels: newPixels}))
        } else {
            const newPixels = grid.pixels.filter(p => !(p.x === x && p.y === y))
            newPixels.push({x, y, color: selectedColor})
            setGrid(prev => ({...prev, pixels: newPixels}))
        }
    }

    const handleMouseDown = (x: number, y: number) => {
        setIsDrawing(true)
        paintPixel(x, y)
    }

    const handleMouseEnter = (x: number, y: number) => {
        if (isDrawing) {
            paintPixel(x, y)
        }
    }

    const handleMouseUp = () => {
        if (isDrawing) {
            setIsDrawing(false)
            saveToHistory(grid.pixels)
        }
    }

    const clearCanvas = () => {
        setGrid(prev => ({...prev, pixels: []}))
        saveToHistory([])
        toast.success('Canvas cleared')
    }

    const exportAsImage = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = grid.width * 10
        canvas.height = grid.height * 10

        // No background fill - keep transparent
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw pixels
        grid.pixels.forEach(pixel => {
            ctx.fillStyle = pixel.color
            ctx.fillRect(pixel.x * 10, pixel.y * 10, 10, 10)
        })

        // Download with transparent background
        const link = document.createElement('a')
        link.download = `pixel-art-${Date.now()}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        
        toast.success('Image exported!')
    }

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null
    }

    const rgbToHex = (r: number, g: number, b: number) => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
    }

    const addColorToPalette = (color: string) => {
        if (!colorPalette.includes(color)) {
            setColorPalette(prev => [...prev, color])
        }
    }

    const removeColorFromPalette = (color: string) => {
        setColorPalette(prev => prev.filter(c => c !== color))
    }

    const exportColorPalette = () => {
        const paletteData = {
            name: `palette-${Date.now()}`,
            colors: colorPalette,
            createdAt: new Date().toISOString()
        }
        
        const blob = new Blob([JSON.stringify(paletteData, null, 2)], {
            type: 'application/json'
        })
        
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${paletteData.name}.json`
        link.click()
        URL.revokeObjectURL(url)
        
        toast.success('Color palette exported!')
    }

    const importColorPalette = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const paletteData = JSON.parse(e.target?.result as string)
                if (paletteData.colors && Array.isArray(paletteData.colors)) {
                    setColorPalette(paletteData.colors)
                    toast.success(`Imported palette: ${paletteData.name || 'Unknown'}`)
                } else {
                    toast.error('Invalid palette file format')
                }
            } catch (error) {
                toast.error('Failed to import palette')
            }
        }
        reader.readAsText(file)
    }

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in inputs
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
            return
        }

        const binding = keyBindings.find(b => 
            b.key.toLowerCase() === event.key.toLowerCase() &&
            !!b.ctrlKey === event.ctrlKey &&
            !!b.shiftKey === event.shiftKey &&
            !!b.altKey === event.altKey
        )

        if (binding) {
            event.preventDefault()
            switch (binding.action) {
                case 'undo':
                    undo()
                    break
                case 'redo':
                    redo()
                    break
                case 'toggleTool':
                    setIsErasing(prev => !prev)
                    break
                case 'clearCanvas':
                    clearCanvas()
                    break
                case 'exportImage':
                    exportAsImage()
                    break
                case 'paint':
                    setIsErasing(false)
                    break
                case 'erase':
                    setIsErasing(true)
                    break
            }
        }
    }, [keyBindings, undo, redo, clearCanvas, exportAsImage])

    const updateKeyBinding = (oldBinding: KeyBinding, newBinding: KeyBinding) => {
        setKeyBindings(prev => prev.map(b => 
            b.action === oldBinding.action ? newBinding : b
        ))
    }

    const formatKeyBinding = (binding: KeyBinding) => {
        const parts = []
        if (binding.ctrlKey) parts.push('Ctrl')
        if (binding.shiftKey) parts.push('Shift')
        if (binding.altKey) parts.push('Alt')
        parts.push(binding.key.toUpperCase())
        return parts.join(' + ')
    }

    const rgb = hexToRgb(selectedColor)

    useEffect(() => {
        // Add keyboard event listener
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [handleKeyDown])

    // Load animation data if animationId is provided
    useEffect(() => {
        if (animationId) {
            loadAnimationData(animationId)
        }
    }, [animationId])

    const loadAnimationData = async (id: string) => {
        try {
            const animation = await getAnimationForEditor(id)
            if (animation) {
                setCurrentAnimation(animation)
                setAnimationName(animation.name)
                // Load the first frame into the editor
                if (animation.frames.length > 0) {
                    // This would need to be implemented based on how frames are stored
                    // For now, we'll just set the animation reference
                    toast.success(`Loaded animation: ${animation.name}`)
                }
            }
        } catch (error) {
            toast.error('Failed to load animation')
        }
    }

    const saveToAnimationPage = async () => {
        try {
            // Create animation from current editor state
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Set canvas size
            const {width, height} = getGridDimensions()
            canvas.width = width * 8 // 8px per grid cell
            canvas.height = height * 8

            // Draw current grid state
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            grid.pixels.forEach(pixel => {
                ctx.fillStyle = pixel.color
                ctx.fillRect(pixel.x * 8, pixel.y * 8, 8, 8)
            })

            // Convert to data URL
            const dataUrl = canvas.toDataURL()

            // Create animation object
            const animation: PixelArtAnimation = {
                id: currentAnimation?.id || `animation_${Date.now()}`,
                name: animationName || 'Untitled Animation',
                frames: [{
                    id: `frame_${Date.now()}`,
                    dataUrl: dataUrl,
                    timestamp: Date.now()
                }],
                prompt: `Pixel art created in editor: ${animationName || 'Untitled'}`,
                createdAt: Date.now(),
                config: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.9,
                    frameCount: 1
                }
            }

            await saveAnimationFromEditor(animation)
            toast.success('Animation saved to main page!')
            router.push('/')
        } catch (error) {
            toast.error('Failed to save animation')
        }
    }

    return (
        <motion.div
            className="h-screen flex flex-col overflow-hidden"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{duration: 0.5}}
        >
            {/* Top Menu Bar */}
            <motion.div
                className="border-b px-4 py-2 flex items-center justify-between shrink-0"
                initial={{y: -20, opacity: 0}}
                animate={{y: 0, opacity: 1}}
                transition={{delay: 0.1, duration: 0.5}}
            >
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ArrowLeft className="h-4 w-4"/>
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5"/>
                        <h1 className="text-sm font-pixel tracking-wider">PIXEL ART EDITOR</h1>
                    </div>
                    <Badge variant="secondary" className="text-xs font-pixel">
                        {grid.width}×{grid.height}
                    </Badge>
                    
                    {/* Animation Name Input */}
                    <div className="flex items-center gap-2">
                        <Label className="text-xs font-pixel tracking-wider">NAME:</Label>
                        <Input
                            value={animationName}
                            onChange={(e) => setAnimationName(e.target.value)}
                            placeholder="Animation name"
                            className="h-8 w-32 text-xs font-pixel"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={undo}
                        disabled={historyIndex <= 0}
                        className="h-8 w-8 p-0"
                    >
                        <Undo className="h-4 w-4"/>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={redo}
                        disabled={historyIndex >= history.length - 1}
                        className="h-8 w-8 p-0"
                    >
                        <Redo className="h-4 w-4"/>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={saveToAnimationPage}
                        className="h-8 px-3 font-pixel text-xs tracking-wider"
                    >
                        <Send className="h-4 w-4 mr-1"/>
                        SAVE
                    </Button>
                    <Dialog open={showKeyBindingsDialog} onOpenChange={setShowKeyBindingsDialog}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                            >
                                <Keyboard className="h-4 w-4"/>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="font-pixel text-sm tracking-wider">
                                    KEY BINDINGS
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                {keyBindings.map((binding, index) => (
                                    <div key={binding.action} className="flex items-center justify-between p-2 border rounded">
                                        <div className="flex-1">
                                            <div className="font-pixel text-xs tracking-wider uppercase">
                                                {binding.action.replace(/([A-Z])/g, ' $1')}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatKeyBinding(binding)}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingBinding(binding)}
                                            className="font-pixel text-xs"
                                        >
                                            EDIT
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                    <ModeToggle/>
                </div>
            </motion.div>

            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup direction="horizontal">
                    {/* Left Panel - Colors */}
                    <ResizablePanel defaultSize={20} minSize={18} maxSize={30}>
                        <motion.div
                            className="h-full border-r flex flex-col"
                            initial={{x: -20, opacity: 0}}
                            animate={{x: 0, opacity: 1}}
                            transition={{delay: 0.2, duration: 0.5}}
                        >
                            <div className="p-4 border-b">
                                <h2 className="font-pixel text-sm tracking-wider">COLORS</h2>
                            </div>

                                                        <ScrollArea className="flex-1 p-4">
                                <div className="space-y-6">
                                    {/* Current Color */}
                                    <div className="space-y-3">
                                        <h3 className="font-pixel text-xs text-muted-foreground tracking-wider">CURRENT</h3>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-12 h-12 rounded border-2 border-muted-foreground/20"
                                                style={{backgroundColor: selectedColor}}
                                            />
                                            <div className="flex-1">
                                                <div className="text-xs font-pixel font-mono">{selectedColor.toUpperCase()}</div>
                                                {rgb && (
                                                    <div className="text-xs text-muted-foreground font-mono">
                                                        RGB({rgb.r}, {rgb.g}, {rgb.b})
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <Separator/>

                                    {/* Color Picker */}
                                    <div className="space-y-3">
                                        <h3 className="font-pixel text-xs text-muted-foreground tracking-wider">PICKER</h3>
                                        <div className="space-y-2">
                                            <div>
                                                <Label className="text-xs font-pixel">HEX</Label>
                                                <Input
                                                    type="text"
                                                    value={selectedColor}
                                                    onChange={(e) => setSelectedColor(e.target.value)}
                                                    className="text-xs font-mono"
                                                    placeholder="#000000"
                                                />
                                            </div>
                                            {rgb && (
                                                <div className="space-y-2">
                                                    <div>
                                                        <Label className="text-xs font-pixel">R</Label>
                                                        <Input
                                                            type="number"
                                                            value={rgb.r}
                                                            onChange={(e) => {
                                                                const newR = Math.max(0, Math.min(255, parseInt(e.target.value) || 0))
                                                                setSelectedColor(rgbToHex(newR, rgb.g, rgb.b))
                                                            }}
                                                            min="0"
                                                            max="255"
                                                            className="text-xs"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs font-pixel">G</Label>
                                                        <Input
                                                            type="number"
                                                            value={rgb.g}
                                                            onChange={(e) => {
                                                                const newG = Math.max(0, Math.min(255, parseInt(e.target.value) || 0))
                                                                setSelectedColor(rgbToHex(rgb.r, newG, rgb.b))
                                                            }}
                                                            min="0"
                                                            max="255"
                                                            className="text-xs"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs font-pixel">B</Label>
                                                        <Input
                                                            type="number"
                                                            value={rgb.b}
                                                            onChange={(e) => {
                                                                const newB = Math.max(0, Math.min(255, parseInt(e.target.value) || 0))
                                                                setSelectedColor(rgbToHex(rgb.r, rgb.g, newB))
                                                            }}
                                                            min="0"
                                                            max="255"
                                                            className="text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            <input
                                                type="color"
                                                value={selectedColor}
                                                onChange={(e) => setSelectedColor(e.target.value)}
                                                className="w-full h-10 rounded border cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <Separator/>

                                    {/* Color Palette */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-pixel text-xs text-muted-foreground tracking-wider">PALETTE</h3>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => paletteInputRef.current?.click()}
                                                    className="h-6 w-6 p-0"
                                                    title="Import palette"
                                                >
                                                    <FileUp className="h-3 w-3"/>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={exportColorPalette}
                                                    className="h-6 w-6 p-0"
                                                    title="Export palette"
                                                >
                                                    <FileDown className="h-3 w-3"/>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => addColorToPalette(selectedColor)}
                                                    className="h-6 w-6 p-0"
                                                    title="Add current color"
                                                >
                                                    +
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {colorPalette.map((color, index) => (
                                                <motion.button
                                                    key={color}
                                                    className={`w-full h-8 rounded border-2 transition-all ${
                                                        selectedColor === color ? 'border-primary' : 'border-muted-foreground/20'
                                                    }`}
                                                    style={{backgroundColor: color}}
                                                    onClick={() => setSelectedColor(color)}
                                                    onDoubleClick={() => removeColorFromPalette(color)}
                                                    whileHover={{scale: 1.05}}
                                                    whileTap={{scale: 0.95}}
                                                    title={`${color.toUpperCase()} - Double click to remove`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </motion.div>
                    </ResizablePanel>

                    <ResizableHandle withHandle/>

                    {/* Center Panel - Canvas */}
                    <ResizablePanel defaultSize={60} minSize={40}>
                        <motion.div
                            className="h-full flex flex-col"
                            initial={{scale: 0.95, opacity: 0}}
                            animate={{scale: 1, opacity: 1}}
                            transition={{delay: 0.3, duration: 0.5}}
                        >
                            <div className="flex-1 flex items-center justify-center p-8">
                                <div
                                    ref={canvasRef}
                                    className="border-2 border-dashed border-muted-foreground/20 p-4 rounded-lg bg-background"
                                    style={{
                                        width: grid.width * cellSize + 32,
                                        height: grid.height * cellSize + 32
                                    }}
                                >
                                    <div
                                        className="grid border border-muted-foreground/20 select-none"
                                        style={{
                                            gridTemplateColumns: `repeat(${grid.width}, 1fr)`,
                                            gridTemplateRows: `repeat(${grid.height}, 1fr)`,
                                            width: grid.width * cellSize,
                                            height: grid.height * cellSize
                                        }}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseUp}
                                        onDragStart={(e) => e.preventDefault()}
                                        onDrop={(e) => e.preventDefault()}
                                        onDragOver={(e) => e.preventDefault()}
                                    >
                                        {Array.from({length: grid.height}).map((_, y) =>
                                            Array.from({length: grid.width}).map((_, x) => (
                                                <div
                                                    key={`${x}-${y}`}
                                                    className="border border-muted-foreground/10 cursor-crosshair hover:bg-muted/20 transition-colors select-none"
                                                    style={{
                                                        width: cellSize,
                                                        height: cellSize,
                                                        backgroundColor: getPixelColor(x, y)
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault()
                                                        handleMouseDown(x, y)
                                                    }}
                                                    onMouseEnter={() => handleMouseEnter(x, y)}
                                                    onDragStart={(e) => e.preventDefault()}
                                                    onContextMenu={(e) => e.preventDefault()}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </ResizablePanel>

                    <ResizableHandle withHandle/>

                    {/* Right Panel - Tools */}
                    <ResizablePanel defaultSize={20} minSize={18} maxSize={30}>
                        <motion.div
                            className="h-full border-l flex flex-col"
                            initial={{x: 20, opacity: 0}}
                            animate={{x: 0, opacity: 1}}
                            transition={{delay: 0.4, duration: 0.5}}
                        >
                            <div className="p-4 border-b">
                                <h2 className="font-pixel text-sm tracking-wider">TOOLS</h2>
                            </div>

                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-6">
                                    {/* Grid Settings */}
                                    <div className="space-y-3">
                                        <h3 className="font-pixel text-xs text-muted-foreground tracking-wider">GRID SIZE</h3>
                                        <Select value={gridSize} onValueChange={(value: any) => setGridSize(value)}>
                                            <SelectTrigger className="text-xs">
                                                <SelectValue/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="8x8">8×8</SelectItem>
                                                <SelectItem value="16x16">16×16</SelectItem>
                                                <SelectItem value="32x32">32×32</SelectItem>
                                                <SelectItem value="custom">Custom</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {gridSize === 'custom' && (
                                            <div className="space-y-2">
                                                <div>
                                                    <Label className="text-xs font-pixel">WIDTH</Label>
                                                    <Input
                                                        type="number"
                                                        value={customWidth}
                                                        onChange={(e) => setCustomWidth(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                                        min="1"
                                                        max="100"
                                                        className="text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-pixel">HEIGHT</Label>
                                                    <Input
                                                        type="number"
                                                        value={customHeight}
                                                        onChange={(e) => setCustomHeight(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                                        min="1"
                                                        max="100"
                                                        className="text-xs"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <Separator/>

                                    {/* Drawing Tools */}
                                    <div className="space-y-3">
                                        <h3 className="font-pixel text-xs text-muted-foreground tracking-wider">DRAWING</h3>
                                        <div className="flex gap-2">
                                            <Button
                                                variant={!isErasing ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setIsErasing(false)}
                                                className="flex-1 font-pixel text-xs"
                                            >
                                                PAINT
                                            </Button>
                                            <Button
                                                variant={isErasing ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setIsErasing(true)}
                                                className="flex-1 font-pixel text-xs"
                                            >
                                                ERASE
                                            </Button>
                                        </div>
                                    </div>

                                    <Separator/>

                                    {/* Actions */}
                                    <div className="space-y-3">
                                        <h3 className="font-pixel text-xs text-muted-foreground tracking-wider">ACTIONS</h3>
                                        <div className="space-y-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={clearCanvas}
                                                className="w-full font-pixel text-xs"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2"/>
                                                CLEAR
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={exportAsImage}
                                                className="w-full font-pixel text-xs"
                                            >
                                                <Download className="h-4 w-4 mr-2"/>
                                                EXPORT PNG
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </motion.div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {/* Edit Key Binding Dialog */}
            <Dialog open={!!editingBinding} onOpenChange={() => setEditingBinding(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-pixel text-sm tracking-wider">
                            EDIT KEY BINDING
                        </DialogTitle>
                    </DialogHeader>
                    {editingBinding && (
                        <div className="space-y-4">
                            <div>
                                <Label className="text-xs font-pixel tracking-wider">ACTION</Label>
                                <div className="mt-1 p-2 bg-muted rounded text-xs font-pixel tracking-wider uppercase">
                                    {editingBinding.action.replace(/([A-Z])/g, ' $1')}
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs font-pixel tracking-wider">CURRENT BINDING</Label>
                                <div className="mt-1 p-2 bg-muted rounded text-xs font-pixel">
                                    {formatKeyBinding(editingBinding)}
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs font-pixel tracking-wider">NEW BINDING</Label>
                                <Input
                                    type="text"
                                    placeholder="Press new key combination..."
                                    className="text-xs font-pixel"
                                    readOnly
                                    onKeyDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        
                                        // Skip modifier keys by themselves
                                        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
                                            return
                                        }
                                        
                                        const newBinding: KeyBinding = {
                                            action: editingBinding.action,
                                            key: e.key,
                                            ctrlKey: e.ctrlKey,
                                            shiftKey: e.shiftKey,
                                            altKey: e.altKey
                                        }
                                        updateKeyBinding(editingBinding, newBinding)
                                        setEditingBinding(null)
                                        toast.success('Key binding updated!')
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Hidden file inputs */}
            <input
                ref={paletteInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={importColorPalette}
            />
        </motion.div>
    )
} 