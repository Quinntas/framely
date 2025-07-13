'use server'

import { revalidatePath } from 'next/cache'

export interface PixelArtFrame {
  id: string
  dataUrl: string
  timestamp: number
}

export interface PixelArtAnimation {
  id: string
  name: string
  frames: PixelArtFrame[]
  prompt: string
  createdAt: number
  config: GenerationConfig
}

export interface HistoryItem {
  id: string
  prompt: string
  animation: PixelArtAnimation
  createdAt: number
}

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
}

export interface GenerationConfig {
  temperature: number
  topK: number
  topP: number
  frameCount: number
}

export interface PromptStructure {
  style: string
  action: string
  object: string
  background: string
  customPrompt?: string
}

// Mock storage (in real app, this would be a database)
let history: HistoryItem[] = []

export async function generatePixelArt(
  promptStructure: PromptStructure, 
  config: GenerationConfig,
  imageInputs?: string[]
): Promise<PixelArtAnimation> {
  // Mock AI pixel art generation
  await new Promise(resolve => setTimeout(resolve, 2000 + (config.frameCount * 200))) // Simulate processing time
  
  const animationId = `anim_${Date.now()}`
  
  // Generate frames based on frameCount
  const frames: PixelArtFrame[] = []
  const fullPrompt = buildPromptFromStructure(promptStructure)
  
  for (let i = 0; i < config.frameCount; i++) {
    const canvas = createMockPixelArt(fullPrompt, i, promptStructure.style)
    frames.push({
      id: `frame_${i}`,
      dataUrl: canvas,
      timestamp: Date.now() + i * 100
    })
  }
  
  const animation: PixelArtAnimation = {
    id: animationId,
    name: `${promptStructure.style} ${promptStructure.object}`,
    frames,
    prompt: fullPrompt,
    createdAt: Date.now(),
    config
  }
  
  // Add to history
  history.unshift({
    id: `history_${Date.now()}`,
    prompt: fullPrompt,
    animation,
    createdAt: Date.now()
  })
  
  // Keep only last 50 items
  history = history.slice(0, 50)
  
  return animation
}

export async function reorderFrames(animationId: string, newOrder: string[]): Promise<void> {
  // In a real app, this would update the database
  // For now, we'll just simulate the operation
  await new Promise(resolve => setTimeout(resolve, 500))
  revalidatePath('/')
}

export async function updateFrame(animationId: string, frameId: string, newDataUrl: string): Promise<void> {
  // In a real app, this would update the specific frame
  await new Promise(resolve => setTimeout(resolve, 500))
  revalidatePath('/')
}

export async function improvePrompt(originalPrompt: string): Promise<string> {
  // Mock AI prompt improvement
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const improvements = [
    "pixel art style, 8-bit aesthetic, vibrant colors",
    "retro gaming inspired, detailed sprite work",
    "minimalist pixel design, clean edges",
    "colorful 16-bit style animation",
    "nostalgic arcade game aesthetic"
  ]
  
  const randomImprovement = improvements[Math.floor(Math.random() * improvements.length)]
  return `${originalPrompt}, ${randomImprovement}`
}

export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  // Mock web search
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  const mockResults: WebSearchResult[] = [
    {
      title: "Pixel Art Inspiration Gallery",
      url: "https://pixelart.com/gallery",
      snippet: "Discover amazing pixel art examples and techniques for creating stunning 8-bit animations."
    },
    {
      title: "Best Pixel Art Color Palettes",
      url: "https://gamedev.com/colors",
      snippet: "Essential color palettes for pixel art that will make your animations pop."
    },
    {
      title: "Pixel Art Animation Tutorials",
      url: "https://tutorials.com/pixelart",
      snippet: "Learn how to create smooth pixel art animations with these step-by-step guides."
    }
  ]
  
  return mockResults
}

export async function getHistory(): Promise<HistoryItem[]> {
  return history
}

export async function deleteHistoryItem(id: string): Promise<void> {
  history = history.filter(item => item.id !== id)
  revalidatePath('/')
}

export async function clearHistory(): Promise<void> {
  history = []
  revalidatePath('/')
}

// Animation sharing between editor and main page
export async function saveAnimationFromEditor(animation: PixelArtAnimation): Promise<void> {
  // Add animation to history
  history.unshift({
    id: `history_${Date.now()}`,
    prompt: animation.prompt,
    animation: animation,
    createdAt: Date.now()
  })
  
  // Keep only last 50 items
  if (history.length > 50) {
    history = history.slice(0, 50)
  }
  
  revalidatePath('/')
}

export async function getAnimationForEditor(animationId: string): Promise<PixelArtAnimation | null> {
  const historyItem = history.find(item => item.animation.id === animationId)
  return historyItem?.animation || null
}

// Helper function to build prompt from structure
function buildPromptFromStructure(structure: PromptStructure): string {
  const parts = []
  
  if (structure.style) parts.push(structure.style)
  if (structure.object) parts.push(structure.object)
  if (structure.action) parts.push(structure.action)
  if (structure.background && structure.background !== 'no bg') parts.push(structure.background)
  if (structure.customPrompt) parts.push(structure.customPrompt)
  
  return parts.join(', ')
}

// Helper function to create mock pixel art
function createMockPixelArt(prompt: string, frameIndex: number, style: string): string {
  // Mock pixel art data - in real implementation, this would be generated by AI
  const styleVariations = {
    '8-bit': [
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMDAwMDAwIi8+CjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iI0ZGNkI2QiIvPgo8cmVjdCB4PSIzMiIgeT0iMTYiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNGRjZCNkIiLz4KPHJlY3QgeD0iMTYiIHk9IjMyIiB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjNEVDREM0Ii8+CjxyZWN0IHg9IjQwIiB5PSIzMiIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iIzRFQ0RDNCIvPgo8cmVjdCB4PSIyNCIgeT0iNDAiIHdpZHRoPSIxNiIgaGVpZ2h0PSI4IiBmaWxsPSIjNDVCN0QxIi8+Cjwvc3ZnPgo=',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMDAwMDAwIi8+CjxyZWN0IHg9IjIwIiB5PSIxMiIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iI0ZGNkI2QiIvPgo8cmVjdCB4PSIzNiIgeT0iMTIiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNGRjZCNkIiLz4KPHJlY3QgeD0iMTIiIHk9IjI4IiB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjNEVDREM0Ii8+CjxyZWN0IHg9IjQ0IiB5PSIyOCIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iIzRFQ0RDNCIvPgo8cmVjdCB4PSIyNCIgeT0iNDQiIHdpZHRoPSIxNiIgaGVpZ2h0PSI4IiBmaWxsPSIjNDVCN0QxIi8+Cjwvc3ZnPgo=',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMDAwMDAwIi8+CjxyZWN0IHg9IjI0IiB5PSIxNiIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iI0ZGNkI2QiIvPgo8cmVjdCB4PSIzMiIgeT0iMTYiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNGRjZCNkIiLz4KPHJlY3QgeD0iMTYiIHk9IjI0IiB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjNEVDREM0Ii8+CjxyZWN0IHg9IjQwIiB5PSIyNCIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iIzRFQ0RDNCIvPgo8cmVjdCB4PSIyNCIgeT0iNDAiIHdpZHRoPSIxNiIgaGVpZ2h0PSI4IiBmaWxsPSIjNDVCN0QxIi8+Cjwvc3ZnPgo=',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMDAwMDAwIi8+CjxyZWN0IHg9IjE2IiB5PSIyMCIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iI0ZGNkI2QiIvPgo8cmVjdCB4PSI0MCIgeT0iMjAiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNGRjZCNkIiLz4KPHJlY3QgeD0iMjAiIHk9IjI4IiB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjNEVDREM0Ii8+CjxyZWN0IHg9IjM2IiB5PSIyOCIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iIzRFQ0RDNCIvPgo8cmVjdCB4PSIyNCIgeT0iNDAiIHdpZHRoPSIxNiIgaGVpZ2h0PSI4IiBmaWxsPSIjNDVCN0QxIi8+Cjwvc3ZnPgo=',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMDAwMDAwIi8+CjxyZWN0IHg9IjIwIiB5PSIxNiIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iI0ZGNkI2QiIvPgo8cmVjdCB4PSIzNiIgeT0iMTYiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNGRjZCNkIiLz4KPHJlY3QgeD0iMTYiIHk9IjMyIiB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjNEVDREM0Ii8+CjxyZWN0IHg9IjQwIiB5PSIzMiIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iIzRFQ0RDNCIvPgo8cmVjdCB4PSIyNCIgeT0iNDAiIHdpZHRoPSIxNiIgaGVpZ2h0PSI4IiBmaWxsPSIjNDVCN0QxIi8+Cjwvc3ZnPgo='
    ],
    'cartoon': [
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRkZGRkZGIi8+CjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjYiIGZpbGw9IiNGRjZCNkIiLz4KPGNpcmNsZSBjeD0iNDQiIGN5PSIyMCIgcj0iNiIgZmlsbD0iI0ZGNkI2QiIvPgo8cGF0aCBkPSJNMTYgNDBRMzIgNTIgNDggNDBaIiBmaWxsPSIjNEVDREM0Ii8+CjxjaXJjbGUgY3g9IjMyIiBjeT0iMzIiIHI9IjQiIGZpbGw9IiM0NUJE1E0iLz4KPC9zdmc+Cg==',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRkZGRkZGIi8+CjxjaXJjbGUgY3g9IjIyIiBjeT0iMTgiIHI9IjYiIGZpbGw9IiNGRjZCNkIiLz4KPGNpcmNsZSBjeD0iNDIiIGN5PSIyMiIgcj0iNiIgZmlsbD0iI0ZGNkI2QiIvPgo8cGF0aCBkPSJNMTggNDBRMzIgNTAgNDYgNDBaIiBmaWxsPSIjNEVDREM0Ii8+CjxjaXJjbGUgY3g9IjMyIiBjeT0iMzAiIHI9IjQiIGZpbGw9IiM0NUJE1E0iLz4KPC9zdmc+Cg==',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRkZGRkZGIi8+CjxjaXJjbGUgY3g9IjE4IiBjeT0iMjIiIHI9IjYiIGZpbGw9IiNGRjZCNkIiLz4KPGNpcmNsZSBjeD0iNDYiIGN5PSIxOCIgcj0iNiIgZmlsbD0iI0ZGNkI2QiIvPgo8cGF0aCBkPSJNMjAgNDBRMzIgNDggNDQgNDBaIiBmaWxsPSIjNEVDREM0Ii8+CjxjaXJjbGUgY3g9IjMyIiBjeT0iMjgiIHI9IjQiIGZpbGw9IiM0NUJE1E0iLz4KPC9zdmc+Cg==',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRkZGRkZGIi8+CjxjaXJjbGUgY3g9IjIwIiBjeT0iMTgiIHI9IjYiIGZpbGw9IiNGRjZCNkIiLz4KPGNpcmNsZSBjeD0iNDQiIGN5PSIyMiIgcj0iNiIgZmlsbD0iI0ZGNkI2QiIvPgo8cGF0aCBkPSJNMTYgNDBRMzIgNTAgNDggNDBaIiBmaWxsPSIjNEVDREM0Ii8+CjxjaXJjbGUgY3g9IjMyIiBjeT0iMzAiIHI9IjQiIGZpbGw9IiM0NUJE1E0iLz4KPC9zdmc+Cg==',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRkZGRkZGIi8+CjxjaXJjbGUgY3g9IjIyIiBjeT0iMjAiIHI9IjYiIGZpbGw9IiNGRjZCNkIiLz4KPGNpcmNsZSBjeD0iNDIiIGN5PSIyMCIgcj0iNiIgZmlsbD0iI0ZGNkI2QiIvPgo8cGF0aCBkPSJNMTggNDBRMzIgNTIgNDYgNDBaIiBmaWxsPSIjNEVDREM0Ii8+CjxjaXJjbGUgY3g9IjMyIiBjeT0iMzIiIHI9IjQiIGZpbGw9IiM0NUJE1E0iLz4KPC9zdmc+Cg=='
    ],
    'pixel art': [
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjAyMDIwIi8+CjxyZWN0IHg9IjEyIiB5PSIxMiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjOTZDRUI0Ii8+CjxyZWN0IHg9IjQwIiB5PSIxMiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjOTZDRUI0Ii8+CjxyZWN0IHg9IjIwIiB5PSIzMiIgd2lkdGg9IjI0IiBoZWlnaHQ9IjgiIGZpbGw9IiNGRkVBQTciLz4KPHJlY3QgeD0iMTYiIHk9IjQ0IiB3aWR0aD0iMzIiIGhlaWdodD0iOCIgZmlsbD0iI0REQTBERCIvPgo8L3N2Zz4K',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjAyMDIwIi8+CjxyZWN0IHg9IjE2IiB5PSIxMCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjOTZDRUI0Ii8+CjxyZWN0IHg9IjM2IiB5PSIxNCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjOTZDRUI0Ii8+CjxyZWN0IHg9IjIwIiB5PSIzNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjgiIGZpbGw9IiNGRkVBQTciLz4KPHJlY3QgeD0iMTYiIHk9IjQ2IiB3aWR0aD0iMzIiIGhlaWdodD0iOCIgZmlsbD0iI0REQTBERCIvPgo8L3N2Zz4K',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjAyMDIwIi8+CjxyZWN0IHg9IjE0IiB5PSIxNiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjOTZDRUI0Ii8+CjxyZWN0IHg9IjM4IiB5PSIxMCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjOTZDRUI0Ii8+CjxyZWN0IHg9IjIwIiB5PSIzMCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjgiIGZpbGw9IiNGRkVBQTciLz4KPHJlY3QgeD0iMTYiIHk9IjQyIiB3aWR0aD0iMzIiIGhlaWdodD0iOCIgZmlsbD0iI0REQTBERCIvPgo8L3N2Zz4K',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjAyMDIwIi8+CjxyZWN0IHg9IjEwIiB5PSIxMiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjOTZDRUI0Ii8+CjxyZWN0IHg9IjQyIiB5PSIxMiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjOTZDRUI0Ii8+CjxyZWN0IHg9IjIwIiB5PSIzNiIgd2lkdGg9IjI0IiBoZWlnaHQ9IjgiIGZpbGw9IiNGRkVBQTciLz4KPHJlY3QgeD0iMTYiIHk9IjQ4IiB3aWR0aD0iMzIiIGhlaWdodD0iOCIgZmlsbD0iI0REQTBERCIvPgo8L3N2Zz4K',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjAyMDIwIi8+CjxyZWN0IHg9IjEyIiB5PSIxNCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjOTZDRUI0Ii8+CjxyZWN0IHg9IjQwIiB5PSIxNCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjOTZDRUI0Ii8+CjxyZWN0IHg9IjIwIiB5PSIzNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjgiIGZpbGw9IiNGRkVBQTciLz4KPHJlY3QgeD0iMTYiIHk9IjQ2IiB3aWR0aD0iMzIiIGhlaWdodD0iOCIgZmlsbD0iI0REQTBERCIvPgo8L3N2Zz4K'
    ]
  }
  
  const variations = styleVariations[style as keyof typeof styleVariations] || styleVariations['pixel art']
  return variations[frameIndex % variations.length]
} 