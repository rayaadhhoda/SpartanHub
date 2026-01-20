import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Sparkles, Minimize2, Trash2, Paperclip, FileText, Check, Volume2, Download } from 'lucide-react';
import { ChatMessage, Resource } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AIChatWidgetProps {
  resources?: Resource[];
  selectedResourceIds: Set<string>;
  onToggleResource: (id: string) => void;
  isScreenReaderMode?: boolean;
  onAnnounce?: (text: string) => void;
}

const AIChatWidget: React.FC<AIChatWidgetProps> = ({ 
  resources = [], 
  selectedResourceIds, 
  onToggleResource,
  isScreenReaderMode,
  onAnnounce
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello! I am your Spartan Assistant. How can I help you with your course materials or university data today?',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(messages.length);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    
    // Auto-announce new AI messages
    if (messages.length > prevMessageCount.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'model' && lastMsg.id !== 'welcome') {
        if (isScreenReaderMode && onAnnounce) {
          onAnnounce(`Spartan Assistant says: ${lastMsg.text}`);
        }
      }
      prevMessageCount.current = messages.length;
    }
  }, [messages, isScreenReaderMode, onAnnounce]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    if (isScreenReaderMode && onAnnounce) {
      onAnnounce("Message sent. Waiting for response...");
    }

    // Prepare context from attached files
    let promptToSend = inputText;
    let contextNote = '';

    if (selectedResourceIds.size > 0) {
      const selectedDocs = resources.filter(r => selectedResourceIds.has(r.id));
      const contextString = selectedDocs.map(doc => 
        `[Resource: ${doc.title} (${doc.type}) - ${doc.description} - Tags: ${doc.tags.join(', ')}]`
      ).join('\n');

      promptToSend = `Context from user selected files:\n${contextString}\n\nUser Query: ${inputText}`;
      contextNote = ` (Attached ${selectedResourceIds.size} file${selectedResourceIds.size > 1 ? 's' : ''})`;
      
      setShowResourcePicker(false);
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText, // Display original text to user
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    const responseText = await sendMessageToGemini(promptToSend);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: 'model',
      text: 'Chat cleared. How else can I assist you?',
      timestamp: new Date(),
    }]);
    prevMessageCount.current = 1; // Reset count
    
    if (isScreenReaderMode && onAnnounce) {
      onAnnounce("Chat history cleared.");
    }
  };

  const downloadChat = () => {
    const chatContent = messages.map(m => {
      const sender = m.role === 'user' ? 'You' : 'Spartan Assistant';
      const time = new Date(m.timestamp).toLocaleString();
      return `[${time}] ${sender}:\n${m.text}\n`;
    }).join('\n--------------------------------------------------\n\n');

    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spartan_chat_history_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (isScreenReaderMode && onAnnounce) {
      onAnnounce("Chat history downloaded successfully.");
    }
  };

  const speakMessage = (text: string) => {
    if (onAnnounce) {
      onAnnounce(text);
    } else if ('speechSynthesis' in window) {
       window.speechSynthesis.cancel();
       const utterance = new SpeechSynthesisUtterance(text);
       window.speechSynthesis.speak(utterance);
    }
  };

  const handleToggleResourceLocal = (id: string) => {
     onToggleResource(id);
     // Audio feedback for selection is handled in App.tsx (global handler), 
     // but if we wanted specific feedback here we could add it.
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] md:w-[420px] h-[550px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-sjsu-blue/20 dark:border-gray-700 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300 relative">
          
          {/* Header */}
          <div className="bg-sjsu-blue p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-sjsu-gold p-1.5 rounded-full text-sjsu-blue">
                <Sparkles size={16} fill="currentColor" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm">Spartan Assistant</h3>
                <span className="text-xs text-blue-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  Online
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
               <button 
                onClick={downloadChat} 
                className="hover:bg-white/20 p-1.5 rounded-full transition-colors text-blue-200 hover:text-white"
                title="Download Chat History"
                aria-label="Download Chat History"
               >
                <Download size={16} />
              </button>
               <button 
                onClick={clearChat} 
                className="hover:bg-white/20 p-1.5 rounded-full transition-colors text-blue-200 hover:text-white"
                title="Clear Chat"
                aria-label="Clear Chat History"
               >
                <Trash2 size={16} />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="hover:bg-white/20 p-1.5 rounded-full transition-colors text-blue-200 hover:text-white"
                title="Minimize"
                aria-label="Minimize Chat"
              >
                <Minimize2 size={18} />
              </button>
            </div>
          </div>

          {/* Resource Picker Overlay */}
          {showResourcePicker && (
            <div className="absolute inset-0 top-[60px] bottom-[70px] bg-white dark:bg-gray-800 z-10 flex flex-col animate-in slide-in-from-bottom-5">
              <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                <span className="font-bold text-sm text-gray-700 dark:text-gray-200">Select Files for Context</span>
                <button onClick={() => setShowResourcePicker(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {resources.length === 0 ? (
                  <div className="text-center text-gray-400 p-4 text-xs">No resources available to reference.</div>
                ) : (
                  resources.map(res => (
                    <div 
                      key={res.id}
                      onClick={() => handleToggleResourceLocal(res.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedResourceIds.has(res.id) 
                          ? 'bg-blue-50 border-sjsu-blue dark:bg-blue-900/20 dark:border-blue-500' 
                          : 'bg-white border-gray-100 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                        selectedResourceIds.has(res.id) ? 'bg-sjsu-blue border-sjsu-blue text-white' : 'border-gray-300'
                      }`}>
                        {selectedResourceIds.has(res.id) && <Check size={12} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-gray-800 dark:text-gray-200">{res.title}</p>
                        <p className="text-xs text-gray-500 truncate">{res.type} • {res.subject}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
                 <span className="text-xs text-gray-500">{selectedResourceIds.size} files selected</span>
                 <button 
                   onClick={() => setShowResourcePicker(false)}
                   className="px-4 py-1.5 bg-sjsu-blue text-white text-xs font-bold rounded-full"
                 >
                   Done
                 </button>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] group relative ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                   <div
                    className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-sjsu-blue text-white rounded-br-none'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                    }`}
                  >
                    {msg.role === "model" ? (
                      <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>

                  {/* TTS Button for individual message */}
                  <button 
                    onClick={() => speakMessage(msg.text)}
                    className={`mt-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                      msg.role === 'user' ? 'bg-blue-100 text-sjsu-blue' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                    aria-label="Read message aloud"
                  >
                    <Volume2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-sjsu-gold rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                  <span className="w-2 h-2 bg-sjsu-gold rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                  <span className="w-2 h-2 bg-sjsu-gold rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 relative">
            
            {/* Attached Files Indicator */}
            {selectedResourceIds.size > 0 && !showResourcePicker && (
               <div className="absolute -top-8 left-4 flex gap-2">
                  <div className="bg-sjsu-blue text-white text-xs px-2 py-1 rounded-t-lg shadow-sm flex items-center gap-1">
                    <Paperclip size={10} />
                    {selectedResourceIds.size} file{selectedResourceIds.size > 1 ? 's' : ''} attached
                  </div>
               </div>
            )}

            <div className="flex gap-2 items-center">
              <button
                onClick={() => setShowResourcePicker(!showResourcePicker)}
                className={`p-2 rounded-full transition-colors shrink-0 ${
                  selectedResourceIds.size > 0 
                   ? 'bg-blue-100 text-sjsu-blue dark:bg-blue-900/30 dark:text-blue-300' 
                   : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                }`}
                title="Attach Resources"
                aria-label="Attach Resources"
              >
                <Paperclip size={18} />
              </button>

              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={showResourcePicker ? "Select files first..." : "Ask SpartanAI..."}
                  disabled={showResourcePicker}
                  className="w-full bg-gray-100 dark:bg-gray-700 border-0 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-sjsu-blue focus:bg-white dark:focus:bg-gray-600 dark:text-white transition-all outline-none placeholder-gray-500 dark:placeholder-gray-400"
                  aria-label="Chat Input"
                />
              </div>

              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isLoading}
                className={`p-2 rounded-full transition-colors shrink-0 ${
                  !inputText.trim() || isLoading
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-sjsu-gold text-sjsu-blue hover:bg-yellow-400 shadow-md'
                }`}
                aria-label="Send Message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 bg-sjsu-blue hover:bg-blue-800 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          aria-label="Open Spartan Assistant Chat"
        >
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap font-serif font-bold text-sjsu-gold pl-2">
            Ask SpartanAI
          </span>
          <div className="relative">
             <MessageSquare size={28} />
             {/* Notification dot if items are selected */}
             {selectedResourceIds.size > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-sjsu-blue">
                   {selectedResourceIds.size}
                </span>
             )}
          </div>
        </button>
      )}
    </div>
  );
};

export default AIChatWidget;