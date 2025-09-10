import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, X } from 'lucide-react';

const MessageInput = React.memo(({ 
    group,
    messageText,
    setMessageText,
    editingMessage,
    localEditingMessage,
    onSetEditingMessage,
    selectedFile,
    uploadingFile,
    uploadProgress,
    dragActive,
    fileInputRef,
    getFileIcon,
    formatFileSize,
    handleDrag,
    handleDrop,
    handleFileSelect,
    removeSelectedFile,
    handleInputChange,
    handleSubmit,
    handleKeyDown
}) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messageInputRef = useRef(null);

    const emojis = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘'];

    return (
        <div 
            className={`px-4 py-3 bg-white border-t border-gray-200 flex-shrink-0 transition-all duration-200 ${
                dragActive ? 'bg-blue-50 border-blue-300' : ''
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {/* Drag overlay */}
            {dragActive && (
                <div className="absolute inset-0 bg-blue-100 bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Paperclip className="h-8 w-8 text-white" />
                        </div>
                        <p className="text-lg font-semibold text-blue-700">Drop file here to share</p>
                    </div>
                </div>
            )}

            {/* Editing message indicator */}
            {(editingMessage || localEditingMessage) && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-blue-700 text-sm font-medium">✏️ Editing message</span>
                        <button
                            onClick={() => {
                                onSetEditingMessage?.(null);
                                setMessageText('');
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* File preview */}
            {selectedFile && (
                <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {getFileIcon(selectedFile.type)}
                            <div>
                                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                            </div>
                        </div>
                        <button
                            onClick={removeSelectedFile}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    
                    {/* Upload progress */}
                    {uploadingFile && (
                        <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>Uploading...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end space-x-3">
                <div className="flex-1 relative">
                    <div className="flex items-center space-x-2 mb-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Attach file"
                        >
                            <Paperclip className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Add emoji"
                        >
                            <Smile className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="relative">
                        <textarea
                            ref={messageInputRef}
                            value={messageText}
                            onChange={(e) => {
                                setMessageText(e.target.value);
                                handleInputChange(e.target.value);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={selectedFile ? `Add a message (optional)...` : `Message ${group.name}...`}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50 focus:bg-white transition-colors"
                            rows={1}
                            style={{ minHeight: '44px', maxHeight: '120px' }}
                        />

                        {/* Emoji Picker */}
                        {showEmojiPicker && (
                            <div className="absolute bottom-full left-0 mb-2 p-4 bg-white border border-gray-200 rounded-xl shadow-xl z-10">
                                <div className="grid grid-cols-8 gap-2 text-xl">
                                    {emojis.map(emoji => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => {
                                                setMessageText(prev => prev + emoji);
                                                setShowEmojiPicker(false);
                                            }}
                                            className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={(!messageText.trim() && !selectedFile) || uploadingFile}
                    className={`p-3 rounded-full transition-all duration-200 ${
                        (messageText.trim() || selectedFile) && !uploadingFile
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                    title={editingMessage || localEditingMessage ? 'Update message' : 'Send message'}
                >
                    <Send className="h-5 w-5" />
                </button>
            </form>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
                accept="*/*"
            />
        </div>
    );
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;
