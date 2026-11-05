import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Activity, AlertCircle, TrendingUp, Sparkles, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_BASE_URL = 'http://localhost:8000';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { 
      sender: 'bot', 
      text: 'Hello! I\'m your AI Disease Intelligence Assistant. I can help you with information about disease outbreaks, symptoms, prevention measures, and health recommendations. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (input.trim()) {
      const userMessage = { sender: 'user', text: input, timestamp: new Date() };
      setMessages(prev => [...prev, userMessage]);
      const currentInput = input;
      setInput('');
      setError(null);
      
      // Show typing indicator
      setIsTyping(true);
      
      try {
        // Get JWT token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('Authentication required. Please login again.');
        }

        // Call backend API
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message: currentInput })
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Session expired. Please login again.');
          }
          throw new Error('Failed to get response from AI assistant.');
        }

        const data = await response.json();
        
        setIsTyping(false);
        const botMessage = { 
          sender: 'bot', 
          text: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } catch (err) {
        setIsTyping(false);
        setError(err.message);
        const errorMessage = { 
          sender: 'bot', 
          text: `Error: ${err.message}`,
          isError: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    }
  };

  const handleClearChat = () => {
    setMessages([
      { 
        sender: 'bot', 
        text: 'Hello! I\'m your AI Disease Intelligence Assistant. I can help you with information about disease outbreaks, symptoms, prevention measures, and health recommendations. How can I assist you today?',
        timestamp: new Date()
      }
    ]);
    setError(null);
  };

  const highlightRiskTerms = (text) => {
    // Highlight risk-related terms
    const riskPatterns = [
      { pattern: /\b(high risk|critical|severe|dangerous)\b/gi, className: 'risk-high' },
      { pattern: /\b(medium risk|moderate|caution)\b/gi, className: 'risk-medium' },
      { pattern: /\b(low risk|minimal|safe)\b/gi, className: 'risk-low' }
    ];
    
    return text;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex gap-6">
      {/* Left Info Panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:block w-80 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl shadow-lg p-6 border border-green-200"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">AI Assistant</h3>
            <p className="text-sm text-gray-600">Powered by ML</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">What I Can Do</h4>
            </div>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>• Disease outbreak analysis</li>
              <li>• Symptom identification</li>
              <li>• Prevention guidelines</li>
              <li>• Risk assessment</li>
              <li>• Health recommendations</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Quick Tips</h4>
            </div>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>• Ask specific questions</li>
              <li>• Mention symptoms clearly</li>
              <li>• Provide location if relevant</li>
              <li>• Request prevention tips</li>
            </ul>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Disclaimer</h4>
                <p className="text-xs text-gray-700">
                  This AI assistant provides general information only. For medical emergencies, contact healthcare professionals immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-4 border-b border-green-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI Disease Intelligence Assistant</h1>
                <p className="text-sm text-green-100">Online • Ready to help</p>
              </div>
            </div>
            <button
              onClick={handleClearChat}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'bot' && (
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] p-4 rounded-2xl shadow-md ${
                  message.sender === 'user' 
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none' 
                    : message.isError
                    ? 'bg-red-50 text-red-900 border border-red-200 rounded-tl-none'
                    : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none'
                }`}>
                  {message.sender === 'bot' && !message.isError ? (
                    <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-ul:text-gray-800 prose-li:text-gray-800">
                      <ReactMarkdown
                        components={{
                          // Custom rendering for risk highlights
                          p: ({node, children}) => {
                            const text = String(children);
                            if (/high risk|critical|severe|dangerous/i.test(text)) {
                              return <p className="bg-red-50 border-l-4 border-red-500 pl-3 py-1 my-2">{children}</p>;
                            }
                            if (/medium risk|moderate|caution/i.test(text)) {
                              return <p className="bg-yellow-50 border-l-4 border-yellow-500 pl-3 py-1 my-2">{children}</p>;
                            }
                            if (/low risk|minimal|safe/i.test(text)) {
                              return <p className="bg-green-50 border-l-4 border-green-500 pl-3 py-1 my-2">{children}</p>;
                            }
                            return <p>{children}</p>;
                          },
                          strong: ({node, children}) => {
                            const text = String(children);
                            if (/high risk|critical|severe|dangerous/i.test(text)) {
                              return <strong className="text-red-600 font-bold">{children}</strong>;
                            }
                            if (/medium risk|moderate|caution/i.test(text)) {
                              return <strong className="text-yellow-600 font-bold">{children}</strong>;
                            }
                            if (/low risk|minimal|safe/i.test(text)) {
                              return <strong className="text-green-600 font-bold">{children}</strong>;
                            }
                            return <strong className="font-semibold">{children}</strong>;
                          }
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{message.text}</p>
                  )}
                  <p className={`text-xs mt-2 ${
                    message.sender === 'user' ? 'text-blue-100' : message.isError ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                </div>
                {message.sender === 'user' && (
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 justify-start"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-md border border-gray-200">
                <div className="flex gap-1">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your health question here..."
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className={`px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg ${
                (!input.trim() || isTyping) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              }`}
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send • Connected to AI backend
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Chatbot;
