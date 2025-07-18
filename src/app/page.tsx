'use client'

import {useEffect, useRef, useState} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {Button} from '@/components/ui/button'
import {Textarea} from '@/components/ui/textarea'
import {Badge} from '@/components/ui/badge'
import {ScrollArea} from '@/components/ui/scroll-area'
import {Separator} from '@/components/ui/separator'
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import {Label} from '@/components/ui/label'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {Slider} from '@/components/ui/slider'
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from '@/components/ui/resizable'
import {toast} from 'sonner'
import {Download, History, Palette, Pause, Play, Plus, RefreshCw, Sparkles, Trash2, Upload, Zap, Edit3} from 'lucide-react'
import {ModeToggle} from '@/components/mode-toggle'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'
import Link from 'next/link'

import {
  deleteHistoryItem,
  generatePixelArt,
  type GenerationConfig,
  getHistory,
  type HistoryItem,
  improvePrompt,
  type PixelArtAnimation,
  type PromptStructure
} from './actions'

export default function Home() {
    // Structured prompt state
    const [promptStructure, setPromptStructure] = useState<PromptStructure>({
        style: '8-bit',
        action: 'idle',
        object: 'character',
        background: 'no bg',
        customPrompt: ''
    })

    // Configuration state
    const [config, setConfig] = useState<GenerationConfig>({
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        frameCount: 5
    })

    // UI state
    const [isGenerating, setIsGenerating] = useState(false)
    const [uploadedImages, setUploadedImages] = useState<string[]>([])
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [isImprovingPrompt, setIsImprovingPrompt] = useState(false)
    const [currentAnimations, setCurrentAnimations] = useState<{
        [key: string]: { isPlaying: boolean, currentFrame: number }
    }>({})
    const [selectedAnimation, setSelectedAnimation] = useState<PixelArtAnimation | null>(null)
    const [fps, setFps] = useState(5) // 5 FPS default
    const [activeFrame, setActiveFrame] = useState(0)
    const [hoveredFrameIndex, setHoveredFrameIndex] = useState<number | null>(null)
    const [showInBetweenDialog, setShowInBetweenDialog] = useState(false)
    const [inBetweenFrameIndex, setInBetweenFrameIndex] = useState<number | null>(null)
    const [inBetweenConfig, setInBetweenConfig] = useState<GenerationConfig>(config)
    const [inBetweenPrompt, setInBetweenPrompt] = useState<PromptStructure>(promptStructure)
    const [isDragOver, setIsDragOver] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [isEditingName, setIsEditingName] = useState(false)
    const [tempAnimationName, setTempAnimationName] = useState('')

    const fileInputRef = useRef<HTMLInputElement>(null)
    const animationIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Convert FPS to interval
    const animationSpeed = 1000 / fps

    useEffect(() => {
        loadHistory()
    }, [])

    const loadHistory = async () => {
        try {
            const historyData = await getHistory()
            setHistory(historyData)
        } catch (error) {
            toast.error('Failed to load history')
        }
    }

    const handleGenerate = async () => {
        if (!promptStructure.style || !promptStructure.object) {
            toast.error('Please fill in at least style and object fields')
            return
        }

        setIsGenerating(true)

        try {
            const animation = await generatePixelArt(promptStructure, config, uploadedImages)

            setSelectedAnimation(animation)
            setCurrentAnimations(prev => ({
                ...prev,
                [animation.id]: {isPlaying: true, currentFrame: 0}
            }))

            setActiveFrame(0)
            startAnimation(animation.id)

            await loadHistory()
            toast.success('Pixel art animation generated successfully!')
        } catch (error) {
            toast.error('Failed to generate pixel art')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleGenerateInBetween = async () => {
        if (!selectedAnimation || inBetweenFrameIndex === null) return

        setIsGenerating(true)
        try {
            // This would generate a new frame between the specified frames
            toast.success(`Generated in-between frame after frame ${inBetweenFrameIndex + 1}`)
            setShowInBetweenDialog(false)
            setInBetweenFrameIndex(null)
        } catch (error) {
            toast.error('Failed to generate in-between frame')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleImprovePrompt = async () => {
        const currentPrompt = buildPromptDisplay(promptStructure)
        if (!currentPrompt.trim()) return

        setIsImprovingPrompt(true)
        try {
            const improvedPrompt = await improvePrompt(currentPrompt)
            setPromptStructure(prev => ({
                ...prev,
                customPrompt: improvedPrompt
            }))
            toast.success('Prompt improved!')
        } catch (error) {
            toast.error('Failed to improve prompt')
        } finally {
            setIsImprovingPrompt(false)
        }
    }

    const buildPromptDisplay = (structure: PromptStructure): string => {
        const parts = []
        if (structure.style) parts.push(structure.style)
        if (structure.object) parts.push(structure.object)
        if (structure.action && structure.action !== 'idle') parts.push(structure.action)
        if (structure.background && structure.background !== 'no bg') parts.push(structure.background)
        if (structure.customPrompt) parts.push(structure.customPrompt)
        return parts.join(', ')
    }

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || [])

        files.forEach(file => {
            const reader = new FileReader()
            reader.onload = (e) => {
                if (e.target?.result) {
                    setUploadedImages(prev => [...prev, e.target!.result as string])
                }
            }
            reader.readAsDataURL(file)
        })
    }

    const startAnimation = (animationId: string) => {
        if (animationIntervalRef.current) {
            clearInterval(animationIntervalRef.current)
        }

        animationIntervalRef.current = setInterval(() => {
            setCurrentAnimations(prev => {
                const current = prev[animationId]
                if (!current || !current.isPlaying) {
                    if (animationIntervalRef.current) {
                        clearInterval(animationIntervalRef.current)
                    }
                    return prev
                }

                const animation = selectedAnimation
                if (!animation) return prev

                const nextFrame = (current.currentFrame + 1) % animation.frames.length
                setActiveFrame(nextFrame)
                return {
                    ...prev,
                    [animationId]: {...current, currentFrame: nextFrame}
                }
            })
        }, animationSpeed)
    }

    const toggleAnimation = (animationId: string) => {
        setCurrentAnimations(prev => {
            const current = prev[animationId]
            const newState = {...current, isPlaying: !current.isPlaying}

            if (newState.isPlaying) {
                startAnimation(animationId)
            } else if (animationIntervalRef.current) {
                clearInterval(animationIntervalRef.current)
            }

            return {...prev, [animationId]: newState}
        })
    }

    const downloadAnimation = (animation: PixelArtAnimation) => {
        toast.success('Animation downloaded!')
    }

    const useHistoryItem = (item: HistoryItem) => {
        const parts = item.prompt.split(', ')
        setPromptStructure({
            style: parts[0] || '8-bit',
            object: parts[1] || 'character',
            action: parts[2] || 'idle',
            background: parts[3] || 'no bg',
            customPrompt: parts.slice(4).join(', ') || ''
        })
        
        // Ensure animation has a name property
        const animationWithName = {
            ...item.animation,
            name: item.animation.name || `${parts[0] || '8-bit'} ${parts[1] || 'character'}`
        }
        
        setSelectedAnimation(animationWithName)
        setActiveFrame(0)
        setCurrentAnimations(prev => ({
            ...prev,
            [item.animation.id]: {isPlaying: false, currentFrame: 0}
        }))
        toast.success('Settings loaded from history')
    }

    const handleFrameClick = (frameIndex: number) => {
        setActiveFrame(frameIndex)
        if (selectedAnimation) {
            setCurrentAnimations(prev => ({
                ...prev,
                [selectedAnimation.id]: {
                    ...prev[selectedAnimation.id],
                    currentFrame: frameIndex
                }
            }))
        }
    }

    const handleInBetweenFrameClick = (beforeFrameIndex: number) => {
        setInBetweenFrameIndex(beforeFrameIndex)
        setInBetweenConfig(config)
        setInBetweenPrompt(promptStructure)
        setShowInBetweenDialog(true)
    }

    const handleStartEditingName = () => {
        if (selectedAnimation) {
            setTempAnimationName(selectedAnimation.name)
            setIsEditingName(true)
        }
    }

    const handleSaveAnimationName = () => {
        if (selectedAnimation && tempAnimationName.trim()) {
            setSelectedAnimation(prev => prev ? {...prev, name: tempAnimationName.trim()} : null)
            setIsEditingName(false)
            setTempAnimationName('')
        }
    }

    const handleCancelEditingName = () => {
        setIsEditingName(false)
        setTempAnimationName('')
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)

        const files = Array.from(e.dataTransfer.files)
        const imageFiles = files.filter(file => file.type.startsWith('image/'))

        if (imageFiles.length === 0) {
            toast.error('Please drop image files only')
            return
        }

        if (imageFiles.length > 10) {
            toast.error('Maximum 10 images allowed')
            return
        }

        try {
            const frames = await Promise.all(
                imageFiles.map(async (file, index) => {
                    return new Promise<any>((resolve) => {
                        const reader = new FileReader()
                        reader.onload = (e) => {
                            if (e.target?.result) {
                                resolve({
                                    id: `dropped_${Date.now()}_${index}`,
                                    dataUrl: e.target.result as string,
                                    frameNumber: index + 1
                                })
                            }
                        }
                        reader.readAsDataURL(file)
                    })
                })
            )

            const newAnimation: PixelArtAnimation = {
                id: `animation_${Date.now()}`,
                name: 'Custom Animation',
                frames,
                config: {...config, frameCount: frames.length},
                prompt: 'Custom uploaded animation',
                createdAt: Date.now()
            }

            setSelectedAnimation(newAnimation)
            setCurrentAnimations(prev => ({
                ...prev,
                [newAnimation.id]: {isPlaying: false, currentFrame: 0}
            }))
            setActiveFrame(0)

            toast.success(`Animation created from ${imageFiles.length} images!`)
        } catch (error) {
            toast.error('Failed to create animation from images')
        }
    }

    useEffect(() => {
        if (selectedAnimation && currentAnimations[selectedAnimation.id]?.isPlaying) {
            startAnimation(selectedAnimation.id)
        }

        return () => {
            if (animationIntervalRef.current) {
                clearInterval(animationIntervalRef.current)
            }
        }
    }, [animationSpeed, selectedAnimation])

    return (
        <motion.div
            className="h-screen flex flex-col overflow-hidden font-pixel"
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
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowHistory(!showHistory)}
                            className="h-8 w-8 p-0 lg:hidden"
                        >
                            <History className="h-4 w-4"/>
                        </Button>
                        <Palette className="h-5 w-5"/>
                        <h1 className="text-sm font-pixel tracking-wider">FRAMELY</h1>
                    </div>
                    
                    {/* Animation Name */}
                    <div className="flex items-center gap-2 flex-1 justify-center">
                        {selectedAnimation && (
                            <div className="flex items-center gap-2">
                                {isEditingName ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={tempAnimationName}
                                            onChange={(e) => setTempAnimationName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveAnimationName()
                                                if (e.key === 'Escape') handleCancelEditingName()
                                            }}
                                            className="bg-transparent border-b border-primary text-sm font-pixel tracking-wider focus:outline-none min-w-0 max-w-48"
                                            autoFocus
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleSaveAnimationName}
                                            className="h-6 w-6 p-0"
                                        >
                                            ✓
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCancelEditingName}
                                            className="h-6 w-6 p-0"
                                        >
                                            ✕
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-pixel tracking-wider text-center">
                                            {selectedAnimation.name}
                                        </h2>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleStartEditingName}
                                                    className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                                                >
                                                    <Edit3 className="h-3 w-3"/>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Edit animation name</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="text-xs text-muted-foreground font-pixel hidden sm:block">
                            {selectedAnimation ? `${selectedAnimation.frames.length} FRAMES • ${fps} FPS` : 'NO ANIMATION LOADED'}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="font-pixel text-xs tracking-wider"
                        >
                            <Link href="/editor">
                                <Palette className="h-4 w-4 mr-2"/>
                                EDITOR
                            </Link>
                        </Button>
                    </div>
                </div>
                <ModeToggle/>
            </motion.div>

            <div className="flex-1 overflow-hidden relative">
                <ResizablePanelGroup direction="horizontal">
                    {/* Left History Panel */}
                    <ResizablePanel defaultSize={15} minSize={15} maxSize={35} className="hidden lg:block">
                        <motion.div
                            className="h-full border-r flex flex-col"
                            initial={{x: -20, opacity: 0}}
                            animate={{x: 0, opacity: 1}}
                            transition={{delay: 0.2, duration: 0.5}}
                        >
                            <div className="p-4 border-b">
                                <h2 className="font-pixel text-sm tracking-wider">HISTORY</h2>
                            </div>

                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-3">
                                    <AnimatePresence>
                                        {history.map((item, index) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{opacity: 0, y: 20}}
                                                animate={{opacity: 1, y: 0}}
                                                exit={{opacity: 0, y: -20}}
                                                transition={{delay: index * 0.05, duration: 0.3}}
                                                onClick={() => useHistoryItem(item)}
                                                className={`p-3 border rounded cursor-pointer transition-all hover:bg-accent ${
                                                    selectedAnimation?.id === item.animation.id
                                                        ? 'border-primary bg-accent'
                                                        : ''
                                                }`}
                                                whileHover={{scale: 1.02}}
                                                whileTap={{scale: 0.98}}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1 min-w-0 mr-2">
                                                        <p className="text-xs font-pixel font-semibold tracking-wide truncate mb-1">
                                                            {item.animation.name}
                                                        </p>
                                                        <p className="text-xs font-pixel line-clamp-2 tracking-wide text-muted-foreground">
                                                            {item.prompt}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-1 font-pixel">
                                                            {new Date(item.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            deleteHistoryItem(item.id)
                                                            loadHistory()
                                                        }}
                                                        className="h-6 w-6 p-0 shrink-0"
                                                    >
                                                        <Trash2 className="h-3 w-3"/>
                                                    </Button>
                                                </div>

                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant="outline" className="text-xs font-pixel">
                                                        {item.animation.config.frameCount} FRAMES
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs font-pixel">
                                                        {item.animation.config.temperature}T
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-5 gap-1">
                                                    {item.animation.frames.slice(0, 5).map((frame, index) => (
                                                        <div
                                                            key={frame.id}
                                                            className="aspect-square border rounded overflow-hidden"
                                                        >
                                                            <img
                                                                src={frame.dataUrl}
                                                                alt={`Frame ${index + 1}`}
                                                                className="w-full h-full object-contain bg-black"
                                                                style={{imageRendering: 'pixelated'}}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {history.length === 0 && (
                                        <motion.div
                                            className="text-center text-muted-foreground py-8"
                                            initial={{opacity: 0}}
                                            animate={{opacity: 1}}
                                            transition={{delay: 0.5}}
                                        >
                                            <History className="h-12 w-12 mx-auto mb-2 opacity-50"/>
                                            <p className="text-xs font-pixel tracking-wider">NO HISTORY YET</p>
                                        </motion.div>
                                    )}
                                </div>
                            </ScrollArea>
                        </motion.div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="hidden lg:flex"/>

                    {/* Main Canvas Area */}
                    <ResizablePanel defaultSize={56} minSize={30}>
                        <motion.div
                            className="h-full flex flex-col"
                            initial={{scale: 0.95, opacity: 0}}
                            animate={{scale: 1, opacity: 1}}
                            transition={{delay: 0.3, duration: 0.5}}
                        >
                            {/* Canvas */}
                            <div
                                className="flex-1 flex items-center justify-center p-4 sm:p-8"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <AnimatePresence mode="wait">
                                    {selectedAnimation ? (
                                        <motion.div
                                            key={selectedAnimation.id}
                                            className={`bg-black p-4 sm:p-8 rounded-lg border transition-all ${
                                                isDragOver ? 'border-primary border-2 scale-105' : ''
                                            }`}
                                            initial={{scale: 0.8, opacity: 0}}
                                            animate={{scale: isDragOver ? 1.05 : 1, opacity: 1}}
                                            exit={{scale: 0.8, opacity: 0}}
                                            transition={{duration: 0.4}}
                                            whileHover={{scale: 1.05}}
                                        >
                                            <motion.img
                                                key={activeFrame}
                                                src={selectedAnimation.frames[activeFrame]?.dataUrl}
                                                alt="Pixel Art Canvas"
                                                className="w-48 h-48 sm:w-64 sm:h-64 object-contain"
                                                style={{imageRendering: 'pixelated'}}
                                                initial={{opacity: 0}}
                                                animate={{opacity: 1}}
                                                transition={{duration: 0.2}}
                                            />
                                            {isDragOver && (
                                                <motion.div
                                                    className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center"
                                                    initial={{opacity: 0}}
                                                    animate={{opacity: 1}}
                                                    exit={{opacity: 0}}
                                                >
                                                    <div
                                                        className="text-primary font-pixel text-xs sm:text-sm tracking-wider">DROP
                                                        IMAGES HERE
                                                    </div>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            className={`p-8 sm:p-16 rounded-lg border-2 border-dashed text-center transition-all ${
                                                isDragOver ? 'border-primary bg-primary/5' : ''
                                            }`}
                                            initial={{scale: 0.9, opacity: 0}}
                                            animate={{scale: 1, opacity: 1}}
                                            transition={{duration: 0.5}}
                                        >
                                            <Palette className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-50"/>
                                            <p className="text-muted-foreground font-pixel text-xs sm:text-sm tracking-wider">
                                                {isDragOver ? 'DROP IMAGES TO CREATE ANIMATION' : 'GENERATE YOUR FIRST PIXEL ART'}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Animation Controls */}
                            <AnimatePresence>
                                {selectedAnimation && (
                                    <motion.div
                                        className="border-t p-4 flex items-center justify-center gap-2 sm:gap-4 shrink-0"
                                        initial={{y: 50, opacity: 0}}
                                        animate={{y: 0, opacity: 1}}
                                        exit={{y: 50, opacity: 0}}
                                        transition={{duration: 0.3}}
                                    >
                                        <motion.div whileHover={{scale: 1.05}} whileTap={{scale: 0.95}}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => toggleAnimation(selectedAnimation.id)}
                                                className="font-pixel text-xs tracking-wider"
                                            >
                                                {currentAnimations[selectedAnimation.id]?.isPlaying ? (
                                                    <Pause className="h-4 w-4 mr-1"/>
                                                ) : (
                                                    <Play className="h-4 w-4 mr-1"/>
                                                )}
                                                <span className="hidden sm:inline">
                      {currentAnimations[selectedAnimation.id]?.isPlaying ? 'PAUSE' : 'PLAY'}
                    </span>
                                            </Button>
                                        </motion.div>

                                        <div className="flex items-center gap-2">
                                            <Label
                                                className="text-xs font-pixel tracking-wider hidden sm:block">FPS</Label>
                                            <Slider
                                                value={[fps]}
                                                onValueChange={(value) => setFps(value[0])}
                                                max={30}
                                                min={1}
                                                step={1}
                                                className="w-16 sm:w-24"
                                            />
                                            <span className="text-xs font-pixel w-6 sm:w-8 tracking-wider">{fps}</span>
                                        </div>

                                        <motion.div whileHover={{scale: 1.05}} whileTap={{scale: 0.95}}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => downloadAnimation(selectedAnimation)}
                                                className="font-pixel text-xs tracking-wider"
                                            >
                                                <Download className="h-4 w-4 mr-1"/>
                                                <span className="hidden sm:inline">DOWNLOAD</span>
                                            </Button>
                                        </motion.div>

                                        <motion.div whileHover={{scale: 1.05}} whileTap={{scale: 0.95}}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                asChild
                                                className="font-pixel text-xs tracking-wider"
                                            >
                                                <Link href={`/editor?animationId=${selectedAnimation.id}`}>
                                                    <Palette className="h-4 w-4 mr-1"/>
                                                    <span className="hidden sm:inline">EDIT</span>
                                                </Link>
                                            </Button>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Frame Timeline */}
                            <AnimatePresence>
                                {selectedAnimation && (
                                    <motion.div
                                        className="border-t p-4 shrink-0"
                                        initial={{y: 50, opacity: 0}}
                                        animate={{y: 0, opacity: 1}}
                                        exit={{y: 50, opacity: 0}}
                                        transition={{duration: 0.3, delay: 0.1}}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Label className="text-xs font-pixel tracking-wider">FRAMES</Label>
                                            <Badge variant="secondary" className="text-xs font-pixel">
                                                {activeFrame + 1}/{selectedAnimation.frames.length}
                                            </Badge>
                                        </div>
                                        <div
                                            className="flex gap-1 overflow-x-auto pb-2"
                                            onMouseLeave={() => setHoveredFrameIndex(null)}
                                        >
                                            {selectedAnimation.frames.map((frame, index) => (
                                                <div key={frame.id} className="flex items-center relative">
                                                    <motion.button
                                                        onClick={() => handleFrameClick(index)}
                                                        onMouseEnter={() => setHoveredFrameIndex(index)}
                                                        className={`w-14 h-14 sm:w-16 sm:h-16 border-2 rounded overflow-hidden shrink-0 transition-all ${
                                                            activeFrame === index
                                                                ? 'border-primary shadow-lg'
                                                                : 'border-border hover:border-primary/50'
                                                        }`}
                                                        whileHover={{scale: 1.05}}
                                                        whileTap={{scale: 0.95}}
                                                    >
                                                        <img
                                                            src={frame.dataUrl}
                                                            alt={`Frame ${index + 1}`}
                                                            className="w-full h-full object-contain bg-black"
                                                            style={{imageRendering: 'pixelated'}}
                                                        />
                                                    </motion.button>

                                                    {/* In-between frame generation button */}
                                                    {index < selectedAnimation.frames.length - 1 && (
                                                        <AnimatePresence>
                                                            {hoveredFrameIndex === index && (
                                                                <motion.div
                                                                    className="absolute -right-3 top-1/2 -translate-y-1/2 z-10"
                                                                    initial={{scale: 0, opacity: 0}}
                                                                    animate={{scale: 1, opacity: 1}}
                                                                    exit={{scale: 0, opacity: 0}}
                                                                    transition={{duration: 0.2}}
                                                                >
                                                                    <motion.div whileHover={{scale: 1.2}}
                                                                                whileTap={{scale: 0.9}}>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => handleInBetweenFrameClick(index)}
                                                                            className="h-6 w-6 p-0 rounded-full bg-background border shadow-sm"
                                                                        >
                                                                            <Plus className="h-3 w-3"/>
                                                                        </Button>
                                                                    </motion.div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Chat Interface */}
                            <motion.div
                                className="border-t p-4 flex-1 flex flex-col"
                                initial={{y: 50, opacity: 0}}
                                animate={{y: 0, opacity: 1}}
                                transition={{delay: 0.4, duration: 0.3}}
                            >
                                <div className="max-w-4xl mx-auto h-full flex flex-col">
                                    <div className="flex gap-3 h-full">
                                        <div className="flex-1 min-w-0">
                                            <div className="relative bg-background border rounded-xl p-4 shadow-sm h-full">
                                                <div className="flex gap-3 h-full">
                                                    <div className="flex-1 flex flex-col">
                                                        <Textarea
                                                            value={promptStructure.customPrompt}
                                                            onChange={(e) => setPromptStructure(prev => ({
                                                                ...prev,
                                                                customPrompt: e.target.value
                                                            }))}
                                                            placeholder="Describe your pixel art animation..."
                                                            className="flex-1 resize-none border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0 p-3"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-2 justify-center">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => fileInputRef.current?.click()}
                                                                    className="h-8 w-8 p-0 hover:bg-accent"
                                                                >
                                                                    <Upload className="h-4 w-4"/>
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Upload reference images</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={handleImprovePrompt}
                                                                    disabled={isImprovingPrompt}
                                                                    className="h-8 w-8 p-0 hover:bg-accent"
                                                                >
                                                                    {isImprovingPrompt ? (
                                                                        <RefreshCw className="h-4 w-4 animate-spin"/>
                                                                    ) : (
                                                                        <Zap className="h-4 w-4"/>
                                                                    )}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Enhance prompt with AI</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <motion.div whileHover={{scale: 1.05}} whileTap={{scale: 0.95}}>
                                                                    <Button
                                                                        onClick={handleGenerate}
                                                                        disabled={isGenerating}
                                                                        className="h-8 w-8 p-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                                                                    >
                                                                        {isGenerating ? (
                                                                            <RefreshCw className="h-4 w-4 animate-spin"/>
                                                                        ) : (
                                                                            <Sparkles className="h-4 w-4"/>
                                                                        )}
                                                                    </Button>
                                                                </motion.div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Generate pixel art animation</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="hidden xl:flex"/>

                    {/* Right Configuration Panel */}
                    <ResizablePanel defaultSize={15} minSize={15} maxSize={35} className="hidden xl:block">

                        <motion.div
                            className="h-full border-l flex flex-col"
                            initial={{x: 20, opacity: 0}}
                            animate={{x: 0, opacity: 1}}
                            transition={{delay: 0.4, duration: 0.5}}
                        >
                            <div className="p-4 border-b">
                                <h2 className="font-pixel text-sm tracking-wider">CONFIGURATION</h2>
                            </div>

                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-6">
                                    {/* Prompt Structure */}
                                    <motion.div
                                        className="space-y-3"
                                        initial={{y: 20, opacity: 0}}
                                        animate={{y: 0, opacity: 1}}
                                        transition={{delay: 0.5, duration: 0.3}}
                                    >
                                        <h3 className="font-pixel text-xs text-muted-foreground tracking-wider">PROMPT
                                            STRUCTURE</h3>

                                        <div className="space-y-3">
                                            <div>
                                                <Label className="text-xs font-pixel tracking-wider">STYLE</Label>
                                                <Select value={promptStructure.style}
                                                        onValueChange={(value) => setPromptStructure(prev => ({
                                                            ...prev,
                                                            style: value
                                                        }))}>
                                                    <SelectTrigger className="mt-1 text-xs">
                                                        <SelectValue/>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="8-bit">8-bit</SelectItem>
                                                        <SelectItem value="cartoon">Cartoon</SelectItem>
                                                        <SelectItem value="pixel art">Pixel Art</SelectItem>
                                                        <SelectItem value="retro">Retro</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div>
                                                <Label className="text-xs font-pixel tracking-wider">OBJECT</Label>
                                                <Select value={promptStructure.object}
                                                        onValueChange={(value) => setPromptStructure(prev => ({
                                                            ...prev,
                                                            object: value
                                                        }))}>
                                                    <SelectTrigger className="mt-1 text-xs">
                                                        <SelectValue/>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="character">Character</SelectItem>
                                                        <SelectItem value="creature">Creature</SelectItem>
                                                        <SelectItem value="robot">Robot</SelectItem>
                                                        <SelectItem value="animal">Animal</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div>
                                                <Label className="text-xs font-pixel tracking-wider">ACTION</Label>
                                                <Select value={promptStructure.action}
                                                        onValueChange={(value) => setPromptStructure(prev => ({
                                                            ...prev,
                                                            action: value
                                                        }))}>
                                                    <SelectTrigger className="mt-1 text-xs">
                                                        <SelectValue/>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="idle">Idle</SelectItem>
                                                        <SelectItem value="walking">Walking</SelectItem>
                                                        <SelectItem value="running">Running</SelectItem>
                                                        <SelectItem value="jumping">Jumping</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div>
                                                <Label className="text-xs font-pixel tracking-wider">BACKGROUND</Label>
                                                <Select value={promptStructure.background}
                                                        onValueChange={(value) => setPromptStructure(prev => ({
                                                            ...prev,
                                                            background: value
                                                        }))}>
                                                    <SelectTrigger className="mt-1 text-xs">
                                                        <SelectValue/>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="no bg">No BG</SelectItem>
                                                        <SelectItem value="forest">Forest</SelectItem>
                                                        <SelectItem value="city">City</SelectItem>
                                                        <SelectItem value="space">Space</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </motion.div>

                                    <Separator/>

                                    {/* AI Settings */}
                                    <motion.div
                                        className="space-y-3"
                                        initial={{y: 20, opacity: 0}}
                                        animate={{y: 0, opacity: 1}}
                                        transition={{delay: 0.6, duration: 0.3}}
                                    >
                                        <h3 className="font-pixel text-xs text-muted-foreground tracking-wider">AI
                                            SETTINGS</h3>

                                        <div className="space-y-3">
                                            <div>
                                                <Label className="text-xs font-pixel tracking-wider">TEMPERATURE</Label>
                                                <Slider
                                                    value={[config.temperature]}
                                                    onValueChange={(value) => setConfig(prev => ({
                                                        ...prev,
                                                        temperature: value[0]
                                                    }))}
                                                    max={2}
                                                    min={0}
                                                    step={0.1}
                                                    className="mt-1"
                                                />
                                                <div
                                                    className="text-xs text-muted-foreground mt-1 font-pixel">{config.temperature}</div>
                                            </div>

                                            <div>
                                                <Label className="text-xs font-pixel tracking-wider">TOP K</Label>
                                                <Slider
                                                    value={[config.topK]}
                                                    onValueChange={(value) => setConfig(prev => ({
                                                        ...prev,
                                                        topK: value[0]
                                                    }))}
                                                    max={100}
                                                    min={1}
                                                    step={1}
                                                    className="mt-1"
                                                />
                                                <div
                                                    className="text-xs text-muted-foreground mt-1 font-pixel">{config.topK}</div>
                                            </div>

                                            <div>
                                                <Label className="text-xs font-pixel tracking-wider">TOP P</Label>
                                                <Slider
                                                    value={[config.topP]}
                                                    onValueChange={(value) => setConfig(prev => ({
                                                        ...prev,
                                                        topP: value[0]
                                                    }))}
                                                    max={1}
                                                    min={0}
                                                    step={0.1}
                                                    className="mt-1"
                                                />
                                                <div
                                                    className="text-xs text-muted-foreground mt-1 font-pixel">{config.topP}</div>
                                            </div>

                                            <div>
                                                <Label className="text-xs font-pixel tracking-wider">FRAME COUNT</Label>
                                                <Slider
                                                    value={[config.frameCount]}
                                                    onValueChange={(value) => setConfig(prev => ({
                                                        ...prev,
                                                        frameCount: value[0]
                                                    }))}
                                                    max={10}
                                                    min={3}
                                                    step={1}
                                                    className="mt-1"
                                                />
                                                <div
                                                    className="text-xs text-muted-foreground mt-1 font-pixel">{config.frameCount}</div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Uploaded Images */}
                                    <AnimatePresence>
                                        {uploadedImages.length > 0 && (
                                            <motion.div
                                                className="space-y-3"
                                                initial={{opacity: 0, height: 0}}
                                                animate={{opacity: 1, height: 'auto'}}
                                                exit={{opacity: 0, height: 0}}
                                                transition={{duration: 0.3}}
                                            >
                                                <h3 className="font-pixel text-xs text-muted-foreground tracking-wider">UPLOADED
                                                    IMAGES</h3>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {uploadedImages.map((image, index) => (
                                                        <motion.div
                                                            key={index}
                                                            className="relative"
                                                            initial={{scale: 0, opacity: 0}}
                                                            animate={{scale: 1, opacity: 1}}
                                                            exit={{scale: 0, opacity: 0}}
                                                            transition={{delay: index * 0.1}}
                                                        >
                                                            <img
                                                                src={image}
                                                                alt="Uploaded"
                                                                className="w-full h-16 object-cover rounded border"
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                                                onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== index))}
                                                            >
                                                                ×
                                                            </Button>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </ScrollArea>
                        </motion.div>
                    </ResizablePanel>
                </ResizablePanelGroup>

                {/* Mobile History Overlay */}
                <AnimatePresence>
                    {showHistory && (
                        <>
                            <motion.div
                                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                                initial={{opacity: 0}}
                                animate={{opacity: 1}}
                                exit={{opacity: 0}}
                                onClick={() => setShowHistory(false)}
                            />
                            <motion.div
                                className="fixed left-0 top-0 bottom-0 w-80 bg-background border-r z-50 lg:hidden"
                                initial={{x: -320}}
                                animate={{x: 0}}
                                exit={{x: -320}}
                                transition={{type: "spring", damping: 25, stiffness: 300}}
                            >
                                <div className="p-4 border-b flex items-center justify-between">
                                    <h2 className="font-pixel text-sm tracking-wider">HISTORY</h2>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowHistory(false)}
                                        className="h-8 w-8 p-0"
                                    >
                                        ×
                                    </Button>
                                </div>

                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-3">
                                        <AnimatePresence>
                                            {history.map((item, index) => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{opacity: 0, y: 20}}
                                                    animate={{opacity: 1, y: 0}}
                                                    exit={{opacity: 0, y: -20}}
                                                    transition={{delay: index * 0.05, duration: 0.3}}
                                                    onClick={() => {
                                                        useHistoryItem(item)
                                                        setShowHistory(false)
                                                    }}
                                                    className={`p-3 border rounded cursor-pointer transition-all hover:bg-accent ${
                                                        selectedAnimation?.id === item.animation.id
                                                            ? 'border-primary bg-accent'
                                                            : ''
                                                    }`}
                                                    whileHover={{scale: 1.02}}
                                                    whileTap={{scale: 0.98}}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1 min-w-0 mr-2">
                                                            <p className="text-xs font-pixel font-semibold tracking-wide truncate mb-1">
                                                                {item.animation.name}
                                                            </p>
                                                            <p className="text-xs font-pixel line-clamp-2 tracking-wide text-muted-foreground">
                                                                {item.prompt}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-1 font-pixel">
                                                                {new Date(item.createdAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                deleteHistoryItem(item.id)
                                                                loadHistory()
                                                            }}
                                                            className="h-6 w-6 p-0 shrink-0"
                                                        >
                                                            <Trash2 className="h-3 w-3"/>
                                                        </Button>
                                                    </div>

                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant="outline" className="text-xs font-pixel">
                                                            {item.animation.config.frameCount} FRAMES
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs font-pixel">
                                                            {item.animation.config.temperature}T
                                                        </Badge>
                                                    </div>

                                                    <div className="grid grid-cols-5 gap-1">
                                                        {item.animation.frames.slice(0, 5).map((frame, index) => (
                                                            <div
                                                                key={frame.id}
                                                                className="aspect-square border rounded overflow-hidden"
                                                            >
                                                                <img
                                                                    src={frame.dataUrl}
                                                                    alt={`Frame ${index + 1}`}
                                                                    className="w-full h-full object-contain bg-black"
                                                                    style={{imageRendering: 'pixelated'}}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>

                                        {history.length === 0 && (
                                            <motion.div
                                                className="text-center text-muted-foreground py-8"
                                                initial={{opacity: 0}}
                                                animate={{opacity: 1}}
                                                transition={{delay: 0.5}}
                                            >
                                                <History className="h-12 w-12 mx-auto mb-2 opacity-50"/>
                                                <p className="text-xs font-pixel tracking-wider">NO HISTORY YET</p>
                                            </motion.div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* In-Between Frame Generation Dialog */}
            <Dialog open={showInBetweenDialog} onOpenChange={setShowInBetweenDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-pixel text-sm tracking-wider">
                            GENERATE IN-BETWEEN FRAME
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground font-pixel">
                            Generate a new frame between
                            frame {inBetweenFrameIndex !== null ? inBetweenFrameIndex + 1 : ''} and {inBetweenFrameIndex !== null ? inBetweenFrameIndex + 2 : ''}
                        </p>

                        {/* AI Settings for In-Between Frame */}
                        <div className="space-y-3">
                            <h4 className="font-pixel text-xs text-muted-foreground tracking-wider">FRAME SETTINGS</h4>

                            <div>
                                <Label className="text-xs font-pixel tracking-wider">TEMPERATURE</Label>
                                <Slider
                                    value={[inBetweenConfig.temperature]}
                                    onValueChange={(value) => setInBetweenConfig(prev => ({
                                        ...prev,
                                        temperature: value[0]
                                    }))}
                                    max={2}
                                    min={0}
                                    step={0.1}
                                    className="mt-1"
                                />
                                <div
                                    className="text-xs text-muted-foreground mt-1 font-pixel">{inBetweenConfig.temperature}</div>
                            </div>

                            <div>
                                <Label className="text-xs font-pixel tracking-wider">STYLE</Label>
                                <Select value={inBetweenPrompt.style}
                                        onValueChange={(value) => setInBetweenPrompt(prev => ({
                                            ...prev,
                                            style: value
                                        }))}>
                                    <SelectTrigger className="mt-1 text-xs">
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="8-bit">8-bit</SelectItem>
                                        <SelectItem value="cartoon">Cartoon</SelectItem>
                                        <SelectItem value="pixel art">Pixel Art</SelectItem>
                                        <SelectItem value="retro">Retro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowInBetweenDialog(false)}
                                className="flex-1 font-pixel text-xs tracking-wider"
                            >
                                CANCEL
                            </Button>
                            <Button
                                onClick={handleGenerateInBetween}
                                disabled={isGenerating}
                                className="flex-1 font-pixel text-xs tracking-wider"
                            >
                                {isGenerating ? (
                                    <RefreshCw className="h-4 w-4 mr-1 animate-spin"/>
                                ) : (
                                    <Sparkles className="h-4 w-4 mr-1"/>
                                )}
                                GENERATE
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
            />
        </motion.div>
    )
}
