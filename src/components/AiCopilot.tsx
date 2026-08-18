import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  User,
  Search,
  HardDrive,
  FileCode,
  Terminal,
  Database
} from 'lucide-react';
import { CopilotMessage, RepositoryItem } from '../types';

interface AiCopilotProps {
  files: RepositoryItem[];
}

export const AiCopilot: React.FC<AiCopilotProps> = ({ files }) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      text: `Hello! I am **SVNHS SHS Dept's Gemini AI Asset Assistant**.

I can help you locate specific datasets, analyze file checksums, explain version releases, or generate Python / cURL code snippets to stream files directly into your workspace.

How can I assist you with your repository files today?`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          fileCatalog: files.map((f) => ({
            id: f.id,
            title: f.title,
            path: f.path,
            category: f.category,
            size: f.fileSizeFormatted,
            format: f.format,
            version: f.version,
            sha256: f.sha256,
          })),
        }),
      });

      const data = await res.json();

      const assistantMsg: CopilotMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.text || 'No response returned.',
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Error contacting Gemini Copilot:', err);
      const errorMsg: CopilotMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `⚠️ **Repository Assistant Note**: Connected fallback model (${err.message}). Ensure GEMINI_API_KEY is configured in your project settings for real-time model synthesis.`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'How do I stream climate datasets directly in Python using NetCDF4?',
    'Find open-weights AI model checkpoints above 100 GB in size',
    'Generate a cURL command to download the organic chemistry PDF textbook',
    'Explain how to verify SHA-256 checksums before deploying binary releases',
  ];

  return (
    <div className="space-y-6 pb-12 w-full font-sans">
      {/* Top Banner */}
      <div className="bg-[#101713] p-5 rounded-2xl border border-emerald-900/50 space-y-2 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white font-mono">
              SVNHS SHS Dept Gemini AI Repository Assistant
            </h2>
          </div>
          <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center space-x-1 uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>GEMINI-3.6-FLASH ACTIVE</span>
          </span>
        </div>
        <p className="text-xs text-emerald-200/80">
          Server-side AI assistant trained on your repository catalog metadata. Ask natural language queries about files, request code snippets, or search datasets.
        </p>
      </div>

      {/* Main Chat Enclosure */}
      <div className="bg-[#101713] border border-emerald-900/50 rounded-2xl shadow-xl flex flex-col h-[580px] overflow-hidden">
        {/* Chat Messages Log */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 font-mono text-xs bg-[#090e0b]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl p-4 space-y-2 border ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                    : 'bg-[#131d16] text-slate-100 border-emerald-900/60 shadow-xs'
                }`}
              >
                <div className={`flex items-center justify-between text-[10px] pb-1.5 mb-2 border-b ${
                  msg.role === 'user' ? 'text-emerald-100 border-emerald-400/40' : 'text-emerald-400/80 border-emerald-900/40'
                }`}>
                  <span className="font-bold uppercase tracking-wider">
                    {msg.role === 'user' ? 'FACULTY' : 'SVNHS SHS AI ASSISTANT'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Body */}
                <div className={`whitespace-pre-wrap leading-relaxed space-y-2 ${
                  msg.role === 'user' ? 'text-white' : 'text-slate-100'
                }`}>
                  {msg.text}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="p-2 rounded-xl bg-emerald-900 border border-emerald-700 text-white flex-shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-3 text-emerald-400">
              <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <span className="text-xs font-mono text-emerald-300 animate-pulse">
                Analyzing repository catalog & generating asset response...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Prompts */}
        <div className="p-3 bg-[#0a0f0d] border-t border-emerald-900/50 flex items-center space-x-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400/80 whitespace-nowrap font-bold">Suggested:</span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
              className="px-2.5 py-1 bg-[#15201a] hover:bg-[#1f2e26] text-emerald-200 text-[11px] font-mono rounded-lg border border-emerald-800/60 whitespace-nowrap transition-all hover:border-emerald-500 disabled:opacity-50 cursor-pointer font-medium"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#101713] border-t border-emerald-900/50 flex items-center space-x-2">
          <input
            type="text"
            placeholder="Ask AI Copilot about repository datasets, CLI commands, or file formats..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isLoading}
            className="flex-1 bg-[#090e0b] border border-emerald-800/80 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:bg-[#0c130e] focus:border-emerald-500 transition-all placeholder-emerald-600/70"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputPrompt.trim()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
