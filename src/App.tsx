/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  LogOut, 
  Send, 
  Plus, 
  User, 
  Zap,
  Sparkles,
  Github,
  Info,
  Shield,
  Mail,
  Download,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Tab = 'chat' | 'image' | 'video' | 'about' | 'privacy' | 'contact';
type SmartMode = 'normal' | 'creative' | 'expert';

const AdSlot = ({ className = "" }: { className?: string }) => {
  useEffect(() => {
    // Small delay ensures layout is finished and avoids width=0 errors
    const timer = setTimeout(() => {
      try {
        // Only push if there are uninitialized slots in the DOM
        const slots = document.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status])');
        if (slots.length > 0) {
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch (e) {
        console.error("AdSense error:", e);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`ad-container bg-slate-900/30 border border-dashed border-slate-800 rounded-xl overflow-hidden flex items-center justify-center min-h-[100px] w-full min-w-[250px] text-[10px] uppercase tracking-widest text-slate-500 relative ${className}`}>
      <ins className="adsbygoogle"
           style={{ display: 'block', width: '100%', minWidth: '250px' }}
           data-ad-client="ca-pub-XXXX"
           data-ad-slot="1234567890"
           data-ad-format="auto"
           data-full-width-responsive="true">
      </ins>
    </div>
  );
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [smartMode, setSmartMode] = useState<SmartMode>('normal');
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [credits, setCredits] = useState(100);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Persistence logic
  useEffect(() => {
    const savedUser = localStorage.getItem('smartai_session');
    if (savedUser) {
      const data = JSON.parse(savedUser);
      setUser(data);
      setCredits(data.credits || 100);
      setIsLoggedIn(true);
    }
    
    const savedHistory = localStorage.getItem('smartai_img_history');
    if (savedHistory) {
      setImageHistory(JSON.parse(savedHistory));
    }
  }, []);
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Neural link established. I am SmartAI Pro. How can I assist your creative process?' }
  ]);

  // Image state
  const [imgPrompt, setImgPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [imgAspect, setImgAspect] = useState<"1:1" | "16:9" | "9:16" | "4:3">("1:1");
  const [imgQuality, setImgQuality] = useState<"standard" | "high">("standard");
  const [imgStyle, setImgStyle] = useState<string>("realistic");
  const [imageHistory, setImageHistory] = useState<any[]>([]);
  const [previewImg, setPreviewImg] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');

  // Video state
  const [videoPrompt, setVideoPrompt] = useState('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  useEffect(() => {
    const checkApiKey = async () => {
      // @ts-ignore
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, [activeTab]);

  const handleSelectPlan = (plan: any) => {
    let bonusCredits = 0;
    if (plan.name === 'Pro') bonusCredits = 10000;
    if (plan.name === 'Ultra') bonusCredits = 50000;

    if (bonusCredits > 0) {
      setCredits(prev => prev + bonusCredits);
      alert(`Neural Link Upgraded! ${bonusCredits} credits added to your account.`);
    } else {
      alert("Basic plan active. Credits reset daily.");
    }
    setIsPricingOpen(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('smartai_session', JSON.stringify(data.user));
        setUser(data.user);
        setCredits(data.user.credits || 100);
        setIsLoggedIn(true);
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (error) {
      console.log('Login error:', error);
      alert('Connection lost. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isAiThinking) return;

    if (credits < 1) {
      alert('Your credits are exhausted. Please upgrade to continue.');
      setIsPricingOpen(true);
      return;
    }
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiThinking(true);
    setCredits(prev => prev - 1);

    const modePrompts = {
      normal: "You are a helpful and balanced AI assistant.",
      creative: "You are a visionary creative assistant. Use poetic, vivid, and highly imaginative language.",
      expert: "You are an elite technical expert. Provide concise, ultra-accurate, and deeply technical explanations."
    };

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMsg.content,
        config: {
          systemInstruction: modePrompts[smartMode]
        }
      });
      
      const assistantMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: response.text || "I'm sorry, I couldn't process that request."
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.log('Gemini Chat error:', error);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password) return alert('Email/Key required');
    setIsAuthenticating(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('Signup successful! Neural link ready. Please Authorize.');
      } else {
        alert(data.error || 'Signup failed');
      }
    } catch (error) {
      console.log('Signup error:', error);
      alert('Connection lost. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('smartai_session');
    window.location.reload();
  };

  const handleGenerateImage = async () => {
    if (!imgPrompt.trim() || isGenerating) return;

    if (credits < 5) {
      alert('Insufficient credits for image generation (5 required). Please upgrade.');
      setIsPricingOpen(true);
      return;
    }

    setIsGenerating(true);
    setCredits(prev => prev - 5);
    
    const stylePrompt = imgStyle === 'realistic' ? '' : `, in ${imgStyle} style`;
    const finalPrompt = `${imgPrompt}${stylePrompt}`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ text: finalPrompt }],
        config: {
          imageConfig: {
            aspectRatio: imgAspect
          }
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const newImg = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64Data}`;
          setGeneratedImg(newImg);
          
          const historyEntry = {
            id: Date.now(),
            url: newImg,
            prompt: imgPrompt,
            style: imgStyle,
            timestamp: new Date().toLocaleTimeString()
          };
          
          const updatedHistory = [historyEntry, ...imageHistory].slice(0, 10);
          setImageHistory(updatedHistory);
          localStorage.setItem('smartai_img_history', JSON.stringify(updatedHistory));
          break;
        }
      }
    } catch (error) {
      console.log('Gemini Image error:', error);
      setCredits(prev => prev + 5); // Refund on error
      alert('Diffusion error.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditImage = async () => {
    if (!editPrompt.trim() || !generatedImg || isGenerating) return;

    if (credits < 5) {
      alert('Insufficient credits for image editing (5 required).');
      setIsPricingOpen(true);
      return;
    }

    setIsGenerating(true);
    setCredits(prev => prev - 5);

    try {
      const base64Data = generatedImg.split(',')[1];
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/png' } },
            { text: `Modify this image based on this request: ${editPrompt}` }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: imgAspect
          }
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const newImgData = part.inlineData.data;
          const newImg = `data:image/png;base64,${newImgData}`;
          setGeneratedImg(newImg);
          setIsEditing(false);
          setEditPrompt('');
          
          const historyEntry = {
            id: Date.now(),
            url: newImg,
            prompt: `Edit: ${editPrompt}`,
            style: 'edited',
            timestamp: new Date().toLocaleTimeString()
          };
          
          const updatedHistory = [historyEntry, ...imageHistory].slice(0, 10);
          setImageHistory(updatedHistory);
          localStorage.setItem('smartai_img_history', JSON.stringify(updatedHistory));
          break;
        }
      }
    } catch (error) {
      console.log('Gemini Edit error:', error);
      setCredits(prev => prev + 5);
      alert('Refinement failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async (useImage: boolean = false) => {
    if (!videoPrompt.trim() || isGeneratingVideo) return;
    
    if (credits < 50) {
      alert('Insufficient credits for video synthesis (50 required).');
      setIsPricingOpen(true);
      return;
    }

    setIsGeneratingVideo(true);
    setVideoStatus('Initializing Neural Motion Engine...');

    try {
      // @ts-ignore
      if (!hasApiKey && window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      }

      // Create a fresh instance right before call as per skill guidance
      const sessionAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const videoConfig: any = {
        model: 'veo-3.1-lite-generate-preview',
        prompt: videoPrompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      };

      if (useImage && generatedImg) {
        const base64Data = generatedImg.split(',')[1];
        videoConfig.image = {
          imageBytes: base64Data,
          mimeType: 'image/png'
        };
      }

      // @ts-ignore
      let operation = await sessionAi.models.generateVideos(videoConfig);

      while (!operation.done) {
        setVideoStatus(`Synchronizing Motion Frames... ${operation.progress || 'In Progress'}`);
        await new Promise(resolve => setTimeout(resolve, 8000));
        // @ts-ignore
        operation = await sessionAi.operations.getVideosOperation({ operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        setVideoStatus('Downloading Synapsed Video...');
        // To fetch the video, append the Gemini API key to the `x-goog-api-key` header.
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': (process.env.API_KEY as string),
          },
        });
        
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        
        const blob = await response.blob();
        const videoUrl = URL.createObjectURL(blob);
        setGeneratedVideo(videoUrl);
        setVideoStatus('Motion Synthesis Complete.');
      } else {
        throw new Error('Video generation failed to return a valid URI');
      }

    } catch (error: any) {
      console.error('Video Gen Error:', error);
      
      // Handle the "Requested entity was not found" error to reset key state
      if (error?.message?.includes("Requested entity was not found") || 
          (typeof error === 'string' && error.includes("Requested entity was not found"))) {
        setHasApiKey(false);
        alert('API Key context lost. Please re-authorize via the select key dialog.');
      }

      setCredits(prev => prev + 50);
      alert('Video synthesis failed. Credits refunded.');
      setVideoStatus('');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(79,70,229,0.3)]">
              <Zap className="text-white w-7 h-7 fill-white" />
            </div>
            <h1 className="text-3xl font-medium tracking-tight text-white italic">SmartAI <span className="font-light text-slate-400 not-italic">Pro</span></h1>
            <p className="text-slate-500 text-sm mt-2 font-serif italic text-center">Modern intelligence for the creative mind</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Email Access</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-all font-mono text-sm"
                placeholder="name@nexus.ai"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Security Key</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-all font-mono text-sm"
                placeholder="••••••••"
              />
            </div>
            <div className="pt-2 flex flex-col gap-3 text-xs uppercase tracking-widest font-bold">
              <button 
                type="submit"
                disabled={isAuthenticating}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAuthenticating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Syncing...
                  </>
                ) : 'Authorize'}
              </button>
              <button 
                type="button"
                onClick={handleSignup}
                disabled={isAuthenticating}
                className="w-full bg-transparent border border-slate-800 text-slate-400 py-3 rounded-lg hover:bg-slate-800/50 hover:text-white transition-all active:scale-95 disabled:opacity-50"
              >
                Create Identity
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center text-slate-600">
            <Github className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
            <span className="text-[9px] uppercase tracking-[0.3em] font-mono">Kernel v2.4.0_Stable</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden">
      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImg && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-12"
            onClick={() => setPreviewImg(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setPreviewImg(null)}
                className="absolute -top-12 right-0 p-2 text-white hover:text-indigo-400 transition-colors"
                title="Close"
              >
                <Plus className="w-8 h-8 rotate-45" />
              </button>
              
              <div className="w-full flex-1 flex items-center justify-center overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
                <img 
                  src={previewImg.url} 
                  alt="Full Preview" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              <div className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                <div className="flex-1">
                  <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest font-mono italic">Neural Prompt Archive</span>
                  <p className="text-xs text-slate-300 font-serif italic line-clamp-2 leading-relaxed">{previewImg.prompt || "No prompt archive found in kernel memory"}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewImg.url;
                      link.download = `smartai-archive-${Date.now()}.png`;
                      link.click();
                    }}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <Download className="w-3 h-3" />
                    Download File
                  </button>
                  <button 
                    onClick={() => {
                      setGeneratedImg(previewImg.url);
                      setImgPrompt(previewImg.prompt || "");
                      setPreviewImg(null);
                      setIsEditing(true);
                      setActiveTab('image');
                    }}
                    className="bg-indigo-900 text-white px-8 py-3 dark:border-indigo-500/30 border border-indigo-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-lg hover:bg-indigo-800"
                  >
                    <Sparkles className="w-4 h-4 inline-block mr-2" />
                    Neural Refine
                  </button>
                  <button 
                    onClick={() => {
                      setGeneratedImg(previewImg.url);
                      setImgPrompt(previewImg.prompt || "");
                      setPreviewImg(null);
                      setActiveTab('image');
                    }}
                    className="bg-white text-black px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-lg hover:bg-slate-200"
                  >
                    Refocus Concept
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pricing Modal */}
      <AnimatePresence>
        {isPricingOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-4xl w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold italic tracking-tight">Upgrade Your Neural Link</h2>
                <button onClick={() => setIsPricingOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><Plus className="w-6 h-6 rotate-45" /></button>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { name: 'Basic', price: 'Free', features: ['100 Credits', 'Standard Response', '720p Energy'], color: 'slate-400' },
                  { name: 'Pro', price: '₹199', features: ['10,000 Credits', 'Expert Mode Enabled', '2K Intelligence'], color: 'indigo-500', popular: true },
                  { name: 'Ultra', price: '₹499', features: ['Unlimited Pixels', 'Zero Latency', '4K Imagination'], color: 'emerald-500' }
                ].map((plan) => (
                  <div key={plan.name} className={`p-6 rounded-2xl border ${plan.popular ? 'border-indigo-600 bg-indigo-600/5' : 'border-slate-800 bg-slate-950/50'} relative flex flex-col`}>
                    {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] px-3 py-1 rounded-full uppercase tracking-widest font-bold">Most Popular</span>}
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <div className="mb-4"><span className="text-2xl font-bold">{plan.price}</span><span className="text-slate-500 text-xs"> /month</span></div>
                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="text-xs text-slate-400 flex items-center gap-2"><div className={`w-1 h-1 rounded-full bg-${plan.color}`}></div> {f}</li>
                      ))}
                    </ul>
                    <button 
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${plan.popular ? 'bg-indigo-600 text-white' : 'bg-white text-black hover:bg-slate-200'}`}
                    >
                      Select {plan.name}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 bg-slate-950 border-r border-slate-800 flex-col p-6 overflow-y-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white">S</div>
          <span className="text-xl font-medium tracking-tight text-white">SmartAI <span className="font-light text-slate-400 italic">Pro</span></span>
        </div>

        <div className="mb-8 p-4 bg-indigo-600/10 border border-indigo-600/20 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[9px] uppercase tracking-widest font-bold text-indigo-400">Credits Remaining</span>
            <span className="text-xl font-mono font-bold text-white">{credits}</span>
          </div>
          <button onClick={() => setIsPricingOpen(true)} className="p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors">
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="mb-8">
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-4">Neural Configuration</h2>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-xl">
            {(['normal', 'creative', 'expert'] as SmartMode[]).map((mode) => (
              <button 
                key={mode} 
                onClick={() => setSmartMode(mode)}
                className={`py-2 px-1 text-[9px] uppercase font-bold tracking-tighter rounded-lg transition-all ${smartMode === mode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <nav className="space-y-1">
            {[
              { name: 'Conversation', icon: MessageSquare, tab: 'chat' },
              { name: 'Creation', icon: ImageIcon, tab: 'image' },
              { name: 'Neural Motion', icon: Video, tab: 'video' }
            ].map((item) => (
              <button 
                key={item.name}
                onClick={() => setActiveTab(item.tab as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${activeTab === item.tab ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'}`}
              >
                <item.icon className="w-4 h-4" />
                <span className="font-semibold text-[10px] uppercase tracking-widest">{item.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mb-8 flex-1 overflow-hidden flex flex-col">
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-4">Session Memory</h2>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {messages.filter(m => m.role === 'user').slice(-5).reverse().map((msg) => (
              <div key={msg.id} className="group cursor-pointer p-3 rounded-xl border border-transparent hover:border-slate-800 hover:bg-slate-900/50 transition-all">
                <div className="text-[11px] font-medium text-slate-400 group-hover:text-white transition-colors truncate">
                  {msg.content}
                </div>
                <div className="text-[9px] text-slate-600 mt-1 uppercase font-mono">Archive Link Active</div>
              </div>
            ))}
            {messages.length <= 1 && (
              <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest italic font-serif">No recent data</p>
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <AdSlot className="h-32" />
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/50 text-slate-500 hover:text-red-400 transition-all group"
          >
            <span className="font-bold text-[10px] uppercase tracking-widest">Logout System</span>
            <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen relative bg-slate-950 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-transparent to-transparent">
        {/* Header */}
        <header className="flex items-center justify-between p-6 border-b border-slate-800/50 bg-slate-950/40 backdrop-blur-xl z-20">
           <div className="flex items-center gap-3 md:hidden">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-[10px] font-bold">S</div>
            <span className="font-bold tracking-tight text-white">SmartAI Pro</span>
          </div>
          
          <div className="hidden md:block">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-light text-white">
                {activeTab === 'chat' ? 'Cognitive Neural Stream' : 'Vision Synthesis Lab'}
              </h1>
              <div className="px-2 py-0.5 rounded bg-indigo-600/10 border border-indigo-500/20 text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                {smartMode} Mode
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-serif italic tracking-wide mt-0.5">
              Refining global intelligence with zero-latency response protocols.
            </p>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-3 px-4 py-1.5 bg-slate-900/80 rounded-full border border-slate-800/50 backdrop-blur-md">
                <span className="text-[10px] font-bold text-white tracking-widest">{credits}</span>
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">Sync Ready</span>
             </div>
             <button onClick={() => setIsPricingOpen(true)} className="px-4 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all hidden sm:block shadow-lg">
                Upgrade
             </button>
             <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-white md:hidden">
                <LogOut className="w-5 h-5" />
             </button>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-4 py-8 md:px-12 lg:px-24">
          <div className="max-w-4xl mx-auto w-full">
            <AdSlot className="mb-8 h-24" /> {/* TOP BANNER */}

            {activeTab === 'chat' ? (
              <div className="space-y-8 pb-40">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-[10px] font-bold ${
                        msg.role === 'user' ? 'bg-slate-800' : 'bg-indigo-600 text-white'
                      }`}>
                        {msg.role === 'user' ? 'JD' : 'AI'}
                      </div>
                      <div className={`max-w-[80%] px-5 py-4 text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-slate-800/40 rounded-2xl rounded-tr-none text-slate-200' 
                          : 'bg-indigo-900/10 border border-indigo-500/20 rounded-2xl rounded-tl-none text-slate-300'
                      }`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  {isAiThinking && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-4 items-center"
                    >
                      <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-[10px] font-bold bg-indigo-600 text-white animate-pulse">
                        AI
                      </div>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AdSlot className="mt-8 h-32" /> {/* BELOW CHAT */}
              </div>
            ) : activeTab === 'image' ? (
              <div className="flex flex-col lg:flex-row gap-12 items-start justify-center pt-4 pb-40">
                <div className="w-full lg:w-[450px] space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Creation Workspace</h3>
                    {generatedImg ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative group rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 aspect-square"
                      >
                        <img 
                          src={generatedImg} 
                          alt="AI Generated" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm px-8">
                          <button 
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = generatedImg;
                              link.download = `smartai-${Date.now()}.png`;
                              link.click();
                            }}
                            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <Download className="w-3 h-3" />
                            Export Master
                          </button>
                          <button 
                            onClick={() => setIsEditing(true)}
                            className="w-full bg-indigo-900 border border-indigo-500/30 text-white py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            Modify Vision
                          </button>
                          <button 
                            onClick={() => setGeneratedImg(null)}
                            className="w-full bg-white text-black py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all"
                          >
                            Release Canvas
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="aspect-square w-full bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent"></div>
                        <div className="text-center z-10 space-y-4">
                          <div className="w-12 h-12 border-2 border-dashed border-slate-800 rounded-full mx-auto flex items-center justify-center">
                            <Plus className="w-4 h-4 text-slate-700" />
                          </div>
                          <span className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-bold">Output Preview</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-8 w-full">
                  {isEditing ? (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6 p-8 bg-indigo-950/10 border border-indigo-500/20 rounded-3xl"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold italic text-indigo-400">Neural Refinement Console</h3>
                        <button onClick={() => setIsEditing(false)} className="text-[10px] uppercase font-bold text-slate-600 hover:text-slate-400">Cancel</button>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Transformation Command</label>
                         <textarea 
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          placeholder="What would you like to change? (e.g. Add a spaceship in the background)"
                          className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-5 text-sm resize-none focus:outline-none focus:border-indigo-500/50 transition-all font-serif italic text-slate-400"
                         ></textarea>
                      </div>
                      <button 
                        onClick={handleEditImage}
                        disabled={isGenerating || !editPrompt.trim()}
                        className="w-full py-4 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl font-bold text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98] shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        {isGenerating ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : <Sparkles className="w-4 h-4" />}
                        Execute Transformation
                      </button>
                      <p className="text-[9px] text-center text-slate-600 uppercase tracking-widest">Cost: 5 Neural Credits</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                       <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Prompt Configuration</label>
                       <textarea 
                        value={imgPrompt}
                        onChange={(e) => setImgPrompt(e.target.value)}
                        placeholder="e.g. A hyper-realistic vertical forest skyscraper at sunset..."
                        className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-5 text-sm resize-none focus:outline-none focus:border-indigo-500/50 transition-all font-serif italic text-slate-400"
                       ></textarea>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Aspect Ratio</label>
                        <select 
                          value={imgAspect}
                          onChange={(e) => setImgAspect(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-indigo-500/50"
                        >
                          <option value="1:1">1:1 Square</option>
                          <option value="16:9">16:9 Cinema</option>
                          <option value="9:16">9:16 Portrait</option>
                          <option value="4:3">4:3 Classic</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Aesthetic Style</label>
                        <select 
                          value={imgStyle}
                          onChange={(e) => setImgStyle(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-indigo-500/50"
                        >
                          <option value="realistic">Photorealistic</option>
                          <option value="3d-render">3D Render Unreal Engine</option>
                          <option value="digital-art">Digital Art</option>
                          <option value="cyberpunk">Cyberpunk</option>
                          <option value="anime">Anime Core</option>
                          <option value="vintage">Vintage Film</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl transition-colors hover:border-slate-700">
                        <span className="block text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1">Synapse Quality</span>
                        <select 
                          value={imgQuality}
                          onChange={(e) => setImgQuality(e.target.value as any)}
                          className="bg-transparent border-none p-0 text-xs font-mono focus:outline-none w-full"
                        >
                          <option value="standard">Standard Def</option>
                          <option value="high">HD Ultra</option>
                        </select>
                      </div>
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl transition-colors hover:border-slate-700">
                        <span className="block text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1">Neural Steps</span>
                        <span className="text-xs font-mono">{imgQuality === 'high' ? '120 Ultra' : '50 Normal'}</span>
                      </div>
                    </div>

                    <button 
                      onClick={handleGenerateImage}
                      disabled={isGenerating}
                      className="w-full py-5 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98] shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                          Synthesizing...
                        </>
                      ) : 'Generate Visual'}
                    </button>
                    <AdSlot className="mt-8 h-24" /> {/* BELOW IMAGE GENERATOR */}
                  </div>
                )}

                {imageHistory.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Creative Vault (History)</h3>
                        <button 
                          onClick={() => {
                            setImageHistory([]);
                            localStorage.removeItem('smartai_img_history');
                          }}
                          className="text-[9px] uppercase font-bold text-slate-700 hover:text-red-400 transition-colors"
                        >
                          Clear Vault
                        </button>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {imageHistory.map((img) => (
                          <div 
                            key={img.id} 
                            onClick={() => setPreviewImg(img)}
                            className="aspect-square rounded-lg border border-slate-800 overflow-hidden cursor-pointer hover:border-indigo-500 transition-all group relative"
                          >
                            <img src={img.url} alt="History" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Plus className="w-4 h-4 text-white rotate-45" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-6 bg-indigo-900/5 border border-indigo-500/10 rounded-2xl">
                     <p className="text-xs leading-relaxed text-slate-500 font-serif italic">
                       Professional diffusion pipeline is currently active. All generations are stored in your encrypted creative vault.
                     </p>
                  </div>
                </div>
              </div>
            ) : activeTab === 'video' ? (
              <div className="flex flex-col lg:flex-row gap-12 items-start justify-center pt-4 pb-40">
                <div className="w-full lg:w-[450px] space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Neural Motion Canvas</h3>
                    {generatedVideo ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative group rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 aspect-video flex items-center justify-center"
                      >
                        <video 
                          src={generatedVideo} 
                          controls
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = generatedVideo;
                              link.download = `smartai-video-${Date.now()}.mp4`;
                              link.click();
                            }}
                            className="bg-indigo-600 text-white p-3 rounded-full shadow-xl active:scale-95 transition-all"
                            title="Download Segment"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="aspect-video w-full bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent"></div>
                        <div className="text-center z-10 space-y-4">
                          <div className="w-12 h-12 border-2 border-dashed border-slate-800 rounded-full mx-auto flex items-center justify-center">
                            <Video className="w-4 h-4 text-slate-700" />
                          </div>
                          <span className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-bold">Waiting for Initialization</span>
                          {isGeneratingVideo && (
                            <div className="text-[9px] text-indigo-400 animate-pulse font-mono mt-2">{videoStatus}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-8 w-full">
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Cinematic Prompt</label>
                       <textarea 
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        placeholder="Describe the motion... e.g. A cybernetic dragon flying through a dense neon storm"
                        className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-5 text-sm resize-none focus:outline-none focus:border-indigo-500/50 transition-all font-serif italic text-slate-400"
                       ></textarea>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => handleGenerateVideo(false)}
                        disabled={isGeneratingVideo || !videoPrompt.trim()}
                        className="py-5 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98] shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        {isGeneratingVideo ? 'Synthesizing...' : 'Text to Video'}
                      </button>
                      <button 
                        onClick={() => handleGenerateVideo(true)}
                        disabled={isGeneratingVideo || !videoPrompt.trim() || !generatedImg}
                        className="py-5 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl font-bold text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98] shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        {isGeneratingVideo ? 'Animating...' : 'Image to Video'}
                      </button>
                    </div>
                    
                    {!hasApiKey && (
                      <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-4">
                        <div className="flex items-start gap-3">
                          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Authorization Required</p>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              Veo Neural Motion requires a paid Gemini API key. Please select your authorized key to enable high-fidelity synthesis.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            // @ts-ignore
                            onClick={() => window.aistudio.openSelectKey().then(() => setHasApiKey(true))}
                            className="bg-amber-600 text-white px-6 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-amber-500 transition-all"
                          >
                            Select Paid Key
                          </button>
                          <a 
                            href="https://ai.google.dev/gemini-api/docs/billing" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[9px] text-slate-600 hover:text-slate-400 underline uppercase font-bold tracking-widest transition-colors"
                          >
                            Billing Config
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {!generatedImg && (
                      <p className="text-[9px] text-slate-600 uppercase text-center italic">Tip: Generate an image first to use Image-to-Video</p>
                    )}

                    <AdSlot className="mt-8 h-24" />
                  </div>

                  <div className="p-6 bg-indigo-900/5 border border-indigo-500/10 rounded-2xl">
                     <p className="text-xs leading-relaxed text-slate-500 font-serif italic">
                       Veo Lite Motion Core is currently active. Video synthesis is a deep neural process and may take several minutes to synchronize.
                     </p>
                  </div>
                </div>
              </div>
            ) : activeTab === 'about' ? (
              <div className="max-w-2xl prose prose-invert mx-auto py-12">
                <h2 className="text-3xl font-bold mb-6 italic">About SmartAI Pro</h2>
                <p className="text-slate-400 leading-relaxed font-serif italic mb-8">
                  SmartAI Pro is the ultimate neural bridge between human creativity and machine intelligence. 
                  We leverage advanced diffusion models and massive language architectures to provide a 
                  unified workspace for modern creators.
                </p>
                <div className="grid grid-cols-2 gap-8 py-8 border-y border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">Our Vision</h4>
                    <p className="text-[11px] text-slate-500 uppercase leading-loose">Democratizing high-end intelligence via accessible, intuitive interfaces.</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">The Engine</h4>
                    <p className="text-[11px] text-slate-500 uppercase leading-loose">Powered by the Gemini 2.5 & 3.1 Neural cores for unparallelled accuracy.</p>
                  </div>
                </div>
              </div>
            ) : activeTab === 'privacy' ? (
              <div className="max-w-2xl prose prose-invert mx-auto py-12">
                <h2 className="text-3xl font-bold mb-6 italic">Privacy Protocols</h2>
                <p className="text-slate-400 leading-relaxed font-serif italic mb-6">
                  Your data security is paramount. All neural interactions are processed via encrypted quantum tunnels.
                </p>
                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400">01. Data Collection</h4>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">We only store your email and credit balance strictly for session management.</p>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400">02. Neural Isolation</h4>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Your prompts and generated visuals are never used for base-model retraining.</p>
                </section>
              </div>
            ) : (
              <div className="max-w-2xl prose prose-invert mx-auto py-12">
                <h2 className="text-3xl font-bold mb-6 italic">Contact Terminal</h2>
                <p className="text-slate-400 leading-relaxed font-serif italic mb-8">
                  Technical support and synthesis inquiries can be routed via the following channels.
                </p>
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600/10 rounded-xl"><Mail className="w-5 h-5 text-indigo-400" /></div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-600">Signal Relay</span>
                      <span className="text-sm font-mono">support@smartai.pro</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600/10 rounded-xl"><Github className="w-5 h-5 text-indigo-400" /></div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-600">Code Archive</span>
                      <span className="text-sm font-mono">github.com/smartai-hq</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto px-6 py-12 border-t border-slate-800/30 bg-slate-950/20">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-[10px] font-bold text-white">S</div>
              <span className="text-[10px] uppercase tracking-[4px] font-bold">SmartAI Pro</span>
            </div>
            
            <nav className="flex gap-6">
              {[
                { name: 'About', icon: Info, url: '/about.html' },
                { name: 'Privacy', icon: Shield, url: '/privacy.html' },
                { name: 'Contact', icon: Mail, url: '/contact.html' }
              ].map((item) => (
                <a 
                  key={item.name}
                  href={item.url}
                  className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-slate-500 hover:text-white transition-colors"
                >
                  <item.icon className="w-3 h-3" />
                  {item.name}
                </a>
              ))}
            </nav>

            <div className="text-[9px] uppercase tracking-widest text-slate-600 font-mono">
              © 2026 SmartAI Pro • Global Intelligence Network
            </div>
          </div>
        </footer>

        {/* Input area (Chat only) */}
        {activeTab === 'chat' && (
          <div className="absolute bottom-0 left-0 right-0 p-6 md:px-12 md:pb-12 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pointer-events-none">
            <div className="max-w-4xl mx-auto pointer-events-auto">
              <div className="relative group perspective-1000">
                <motion.div 
                  initial={false}
                  animate={isAiThinking ? { scale: 0.98, opacity: 0.8 } : { scale: 1, opacity: 1 }}
                  className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 rounded-[2rem] shadow-2xl p-2 flex items-center transition-all focus-within:border-indigo-500/50 focus-within:shadow-[0_0_50px_rgba(79,70,229,0.1)]"
                >
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={credits > 0 ? "Describe your next big idea..." : "Access denied. Credits exhausted."}
                    disabled={credits <= 0}
                    className="flex-1 bg-transparent border-none py-4 px-6 text-sm focus:outline-none placeholder:text-slate-600 disabled:cursor-not-allowed"
                  />
                  <div className="hidden sm:flex items-center gap-3 px-4 border-r border-slate-800 h-8 mr-2">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">-1 Credit</span>
                    <div className="w-1 h-1 rounded-full bg-indigo-500 shadow-glow shadow-indigo-500"></div>
                  </div>
                  <button 
                    onClick={handleSendMessage}
                    disabled={credits <= 0 || isAiThinking}
                    className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-xl shadow-indigo-600/30 active:scale-95 disabled:grayscale disabled:opacity-50"
                  >
                    <Send className={`w-5 h-5 ${isAiThinking ? 'animate-pulse' : ''}`} />
                  </button>
                </motion.div>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-6 opacity-40">
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold">Encrypted Quantum Link Established</span>
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold">Module: {smartMode.toUpperCase()}</span>
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold">Latency: 22ms</span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex bg-slate-950 border-t border-slate-800 pb-safe">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex flex-col items-center py-4 ${activeTab === 'chat' ? 'text-indigo-400' : 'text-slate-600'}`}
          >
            <MessageSquare className="w-5 h-5 mb-1" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Logic</span>
          </button>
          <button 
            onClick={() => setActiveTab('image')}
            className={`flex-1 flex flex-col items-center py-4 ${activeTab === 'image' ? 'text-indigo-400' : 'text-slate-600'}`}
          >
            <ImageIcon className="w-5 h-5 mb-1" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Vision</span>
          </button>
        </div>
      </main>
    </div>
  );
}
