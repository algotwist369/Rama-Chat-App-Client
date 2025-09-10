
import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Smile, MoreVertical, Edit, Trash2, Forward, ChevronDown, Users, X, File, Image as ImageIcon, FileText, Music, Video, Archive } from 'lucide-react'
import MessageItem from './MessageItem'
import { formatMessageDate, groupMessagesByDate } from '../utils/formatDate'
import { groupApi } from '../api/groupApi'
import toast from 'react-hot-toast'
import axiosInstance from '../api/axiosInstance'

const ChatWindow = ({
    group,
    messages,
    currentUser,
    editingMessage,
    onSendMessage,
    onEditMessage,
    onDeleteMessage,
    onDeleteMultipleMessages,
    onSetEditingMessage,
    onLoadMore,
    loading,
    loadingMore,
    hasMoreMessages,
    socketService
}) => {
    const [messageText, setMessageText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [showFileUpload, setShowFileUpload] = useState(false)
    const [localEditingMessage, setLocalEditingMessage] = useState(null)
    const [selectedMessages, setSelectedMessages] = useState(new Set())
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [showScrollButton, setShowScrollButton] = useState(false)
    const [isAtBottom, setIsAtBottom] = useState(true)
    const [newMessagesCount, setNewMessagesCount] = useState(0)
    const [lastScrollPosition, setLastScrollPosition] = useState(0)
    const [onlineMembers, setOnlineMembers] = useState([])
    const [onlineCount, setOnlineCount] = useState(0)
    const [showMembersList, setShowMembersList] = useState(false)
    const [isRefreshingStatus, setIsRefreshingStatus] = useState(false)
    const [localTypingUsers, setLocalTypingUsers] = useState(new Map())
    const [dragActive, setDragActive] = useState(false)
    const [selectedFile, setSelectedFile] = useState(null)
    const [uploadingFile, setUploadingFile] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)

    const messageInputRef = useRef(null)
    const fileInputRef = useRef(null)
    const typingTimeoutRef = useRef(null)
    const messagesEndRef = useRef(null)
    const messagesContainerRef = useRef(null)

    useEffect(() => {
        if (editingMessage) {
            setMessageText(editingMessage.text)
            messageInputRef.current?.focus()
        }
    }, [editingMessage])

    // Fetch group members and set up online status listeners
    useEffect(() => {
        if (!group?._id) return;

        const fetchGroupMembers = async () => {
            try {
                const response = await groupApi.getGroupMembers(group._id);
                const allMembers = [...response.users, ...response.managers];
                setOnlineMembers(allMembers);
                setOnlineCount(response.onlineMembers);
            } catch (error) {
                console.error('Error fetching group members:', error);
            }
        };

        fetchGroupMembers();

        // Set up socket listeners for online status
        const handleUserOnline = (data) => {
            console.log('ChatWindow - User came online:', data);
            console.log('ChatWindow - Current online members before update:', onlineMembers);
            
            setOnlineMembers(prev => {
                const updated = prev.map(member => 
                    member._id === data.userId 
                        ? { ...member, isOnline: true, lastSeen: new Date() }
                        : member
                );
                console.log('ChatWindow - Updated online members:', updated);
                return updated;
            });
            setOnlineCount(prev => {
                const newCount = prev + 1;
                console.log('ChatWindow - Online count updated from', prev, 'to', newCount);
                return newCount;
            });
            
            // Show toast notification
            toast.success(`${data.username} is now online`, { duration: 2000 });
        };

        const handleUserOffline = (data) => {
            console.log('ChatWindow - User went offline:', data);
            setOnlineMembers(prev => 
                prev.map(member => 
                    member._id === data.userId 
                        ? { ...member, isOnline: false, lastSeen: data.lastSeen }
                        : member
                )
            );
            setOnlineCount(prev => Math.max(0, prev - 1));
            
            // Show toast notification
            toast(`${data.username} is now offline`, { duration: 2000 });
        };

        // Global status change handler
        const handleUserStatusChanged = (data) => {
            console.log('ChatWindow - Global status changed:', data);
            if (data.isOnline) {
                handleUserOnline(data);
            } else {
                handleUserOffline(data);
            }
        };

        // Set up typing indicator handlers
        const handleTypingStart = ({ userId, username, groupId }) => {
            console.log('ChatWindow - Typing start received:', { userId, username, groupId, currentGroupId: group?._id });
            // Only show typing indicator if it's for the currently selected group
            if (group && groupId.toString() === group._id.toString()) {
                console.log('ChatWindow - Adding typing user:', username);
                setLocalTypingUsers(prev => {
                    const newMap = new Map(prev);
                    newMap.set(userId, username || 'Someone');
                    console.log('ChatWindow - Updated local typing users:', Array.from(newMap.entries()));
                    return newMap;
                });
            } else {
                console.log('ChatWindow - Typing indicator ignored - wrong group or no selected group');
            }
        };

        const handleTypingStop = ({ userId, username, groupId }) => {
            console.log('ChatWindow - Typing stop received:', { userId, username, groupId, currentGroupId: group?._id });
            // Only handle typing stop if it's for the currently selected group
            if (group && groupId.toString() === group._id.toString()) {
                console.log('ChatWindow - Removing typing user:', username);
                setLocalTypingUsers(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(userId);
                    console.log('ChatWindow - Updated local typing users after stop:', Array.from(newMap.entries()));
                    return newMap;
                });
            } else {
                console.log('ChatWindow - Typing stop ignored - wrong group or no selected group');
            }
        };

        // Register socket listeners
        socketService.onUserOnline(handleUserOnline);
        socketService.onUserOffline(handleUserOffline);
        socketService.onUserStatusChanged(handleUserStatusChanged);
        socketService.onTypingStart(handleTypingStart);
        socketService.onTypingStop(handleTypingStop);

        // Cleanup
        return () => {
            socketService.offUserOnline(handleUserOnline);
            socketService.offUserOffline(handleUserOffline);
            socketService.offUserStatusChanged(handleUserStatusChanged);
            socketService.offTypingStart(handleTypingStart);
            socketService.offTypingStop(handleTypingStop);
        };
    }, [group?._id])

    // Periodic refresh of online status (every 30 seconds)
    useEffect(() => {
        if (!group?._id) return;

        const refreshOnlineStatus = async () => {
            try {
                setIsRefreshingStatus(true);
                const response = await groupApi.getGroupMembers(group._id);
                const allMembers = [...response.users, ...response.managers];
                setOnlineMembers(allMembers);
                setOnlineCount(response.onlineMembers);
            } catch (error) {
                console.error('Error refreshing online status:', error);
            } finally {
                setIsRefreshingStatus(false);
            }
        };

        const interval = setInterval(refreshOnlineStatus, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [group?._id])

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1]
            const isLastMessageFromCurrentUser = lastMessage?.senderId?._id === currentUser.id || 
                                               lastMessage?.senderId === currentUser.id
            
            if (isAtBottom) {
                // User is at bottom - auto-scroll for all new messages
                scrollToBottom()
                setNewMessagesCount(0) // Reset counter when at bottom
            } else {
                // User is reading older messages - don't auto-scroll
                if (!isLastMessageFromCurrentUser) {
                    // Count new messages from others
                    setNewMessagesCount(prev => prev + 1)
                }
            }
        }
    }, [messages, isAtBottom, currentUser.id])

    // Check if user is at bottom of messages
    const checkIfAtBottom = () => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
            const threshold = 150 // Increased threshold for better UX
            const atBottom = scrollHeight - scrollTop - clientHeight < threshold
            setIsAtBottom(atBottom)
            
            // Always show scroll button when not at bottom (if there are messages)
            setShowScrollButton(!atBottom && messages.length > 0)
            
            // Reset new messages count when user scrolls to bottom
            if (atBottom) {
                setNewMessagesCount(0)
            }
        }
    }

    // Scroll to bottom function
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }

    // Handle scroll events
    const handleScroll = () => {
        checkIfAtBottom()
        
        // Load more messages when scrolling to top
        if (messagesContainerRef.current && hasMoreMessages && !loadingMore) {
            const { scrollTop } = messagesContainerRef.current
            if (scrollTop < 100) { // Near the top
                onLoadMore()
            }
        }
        
        // Clear notifications when user scrolls to see new messages
        if (newMessagesCount > 0 && !isAtBottom && messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
            
            // If user is scrolling down (towards new messages), clear notifications
            if (scrollTop > lastScrollPosition) {
                // User is scrolling down to see new messages - clear notifications
                setNewMessagesCount(0)
            }
            
            // Update last scroll position
            setLastScrollPosition(scrollTop)
            
            // Also clear if user scrolls more than 30% down
            const scrollProgress = scrollTop / (scrollHeight - clientHeight)
            if (scrollProgress > 0.3) {
                setNewMessagesCount(0)
            }
        }
    }

    // Auto-scroll when group changes or component mounts
    useEffect(() => {
        if (messages.length > 0) {
            setIsAtBottom(true)
            setTimeout(scrollToBottom, 100)
        }
        // Clear typing users when group changes
        setLocalTypingUsers(new Map())
    }, [group._id])

    // Cleanup typing timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
            if (isTyping) {
                socketService.stopTyping(group._id)
            }
        }
    }, [isTyping, group._id])


    const handleInputChange = (e) => {
        setMessageText(e.target.value)
        
        // Handle typing indicators - simplified logic
        if (e.target.value.trim()) {
            if (!isTyping) {
                setIsTyping(true)
                console.log('Starting typing for group:', group._id)
                socketService.startTyping(group._id)
            }
            
            // Clear existing timeout and set new one
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
            
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false)
                console.log('Stopping typing (timeout) for group:', group._id)
                socketService.stopTyping(group._id)
            }, 2000)
        } else {
            // If input is empty, stop typing immediately
            if (isTyping) {
                setIsTyping(false)
                console.log('Stopping typing (empty input) for group:', group._id)
                socketService.stopTyping(group._id)
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        // If there's a selected file, upload it first
        if (selectedFile && !uploadingFile) {
            await uploadFile();
            return;
        }

        if (!messageText.trim() && !selectedFile) return

        if (editingMessage || localEditingMessage) {
            // Handle edit
            const messageToEdit = editingMessage || localEditingMessage
            try {
                await onEditMessage(messageToEdit._id, messageText)
                setLocalEditingMessage(null)
                onSetEditingMessage?.(null)
                setMessageText('')
                toast.success('Message updated')
            } catch (error) {
                toast.error(error.response?.data?.error || 'Failed to update message')
            }
        } else {
            // Handle new message
            const messageData = {
                text: messageText.trim(),
                groupId: group._id
            }

            onSendMessage(messageData, (response) => {
                if (response.ok) {
                    setMessageText('')
                    if (isTyping) {
                        setIsTyping(false)
                        socketService.stopTyping(group._id)
                    }
                    // Ensure we're at bottom after sending
                    setIsAtBottom(true)
                    setTimeout(scrollToBottom, 100)
                }
            })
        }
    }

    // File handling functions
    const getFileIcon = (fileType) => {
        if (fileType?.startsWith('image/')) {
            return <ImageIcon className="h-4 w-4 text-green-500" />;
        } else if (fileType?.startsWith('video/')) {
            return <Video className="h-4 w-4 text-purple-500" />;
        } else if (fileType?.startsWith('audio/')) {
            return <Music className="h-4 w-4 text-pink-500" />;
        } else if (fileType?.includes('pdf') || fileType?.includes('document')) {
            return <FileText className="h-4 w-4 text-red-500" />;
        } else if (fileType?.includes('zip') || fileType?.includes('rar')) {
            return <Archive className="h-4 w-4 text-yellow-500" />;
        } else {
            return <File className="h-4 w-4 text-gray-500" />;
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (file) => {
        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            toast.error('File size must be less than 10MB');
            return;
        }

        setSelectedFile(file);
        setShowFileUpload(false);
    };

    const uploadFile = async () => {
        if (!selectedFile) return;

        setUploadingFile(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await axiosInstance.post('/files/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setUploadProgress(percentCompleted);
                },
            });

            const uploadedFile = response.data.file;
            
            const messageData = {
                text: `📎 ${uploadedFile.originalname}`,
                file: uploadedFile,
                groupId: group._id
            };

            onSendMessage(messageData, (response) => {
                if (response.ok) {
                    setSelectedFile(null);
                    toast.success('File sent successfully');
                }
            });
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload file');
        } finally {
            setUploadingFile(false);
            setUploadProgress(0);
        }
    };

    const removeSelectedFile = () => {
        setSelectedFile(null);
    };

    const handleDeleteMessage = async (messageId) => {
        try {
            await onDeleteMessage(messageId)
            toast.success('Message deleted')
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete message')
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
        } else {
            handleTyping()
        }
    }

    const cancelEdit = () => {
        setEditingMessage(null)
        setMessageText('')
    }

    const filteredTypingUsers = Array.from(localTypingUsers.entries()).filter(([userId, username]) =>
        userId !== currentUser.id && userId !== currentUser._id
    )
    
    // Debug logging
    if (localTypingUsers.size > 0) {
        console.log('ChatWindow - localTypingUsers:', Array.from(localTypingUsers.entries()))
        console.log('ChatWindow - filteredTypingUsers:', filteredTypingUsers)
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-50 h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
                            <p className="text-sm text-gray-500">
                                {group.region} • {group.users?.length || 0} members
                                {onlineCount > 0 && (
                                    <span 
                                        className="text-green-600 ml-2 font-medium flex items-center cursor-pointer hover:text-green-700"
                                        title={`Online: ${onlineMembers.filter(m => m.isOnline).map(m => m.username).join(', ')}`}
                                    >
                                        <div className={`w-2 h-2 bg-green-500 rounded-full mr-1 ${
                                            isRefreshingStatus ? 'animate-spin' : 'animate-pulse'
                                        }`}></div>
                                        {onlineCount} online
                                        {isRefreshingStatus && (
                                            <div className="ml-1 w-2 h-2 border border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                        )}
                                    </span>
                                )}
                                {filteredTypingUsers.length > 0 && (
                                    <span className="text-blue-600 ml-2 font-medium">
                                        {filteredTypingUsers.length === 1 
                                            ? `${filteredTypingUsers[0][1]} is typing...` 
                                            : `${filteredTypingUsers.map(([id, name]) => name).join(', ')} are typing...`
                                        }
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowMembersList(!showMembersList)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        title="View members"
                    >
                        <Users className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Members List Dropdown */}
            {showMembersList && (
                <div className="px-4 py-3 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900">Group Members</h3>
                            <p className="text-xs text-gray-500">
                                {onlineCount} of {onlineMembers.length} online
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button 
                                onClick={async () => {
                                    try {
                                        setIsRefreshingStatus(true);
                                        const response = await groupApi.getGroupMembers(group._id);
                                        const allMembers = [...response.users, ...response.managers];
                                        setOnlineMembers(allMembers);
                                        setOnlineCount(response.onlineMembers);
                                    } catch (error) {
                                        console.error('Error refreshing members:', error);
                                    } finally {
                                        setIsRefreshingStatus(false);
                                    }
                                }}
                                className="text-gray-400 hover:text-gray-600 p-1"
                                title="Refresh status"
                                disabled={isRefreshingStatus}
                            >
                                <div className={`w-4 h-4 ${isRefreshingStatus ? 'animate-spin' : ''}`}>
                                    ↻
                                </div>
                            </button>
                            <button 
                                onClick={() => setShowMembersList(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                        {onlineMembers.map((member) => (
                            <div key={member._id} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                                <div className="flex items-center space-x-2">
                                    <div className="relative">
                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                            {member.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div 
                                            className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-white ${
                                                member.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                                            }`}
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-gray-800 font-medium">{member.username}</span>
                                        {member._id === currentUser.id && (
                                            <span className="text-xs text-blue-600">(You)</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-medium ${
                                        member.isOnline ? 'text-green-600' : 'text-gray-500'
                                    }`}>
                                        {member.isOnline ? 'Online' : 'Offline'}
                                    </span>
                                    {!member.isOnline && member.lastSeen && (
                                        <p className="text-xs text-gray-400">
                                            {new Date(member.lastSeen).toLocaleTimeString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Selection Bar */}
            {selectedMessages.size > 0 && (
                <div className="px-4 py-3 border-b border-gray-200 bg-blue-50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-blue-900">
                                {selectedMessages.size} message{selectedMessages.size > 1 ? 's' : ''} selected
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => {
                                    const messageIds = Array.from(selectedMessages);
                                    onDeleteMultipleMessages(messageIds);
                                    setSelectedMessages(new Set());
                                }}
                                className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-1"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                            </button>
                            <button
                                onClick={() => setSelectedMessages(new Set())}
                                className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-16 py-4 space-y-3 relative min-h-0 scrollbar-hide"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >
                <style jsx>{`
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
                
                {/* Loading More Messages Indicator */}
                {loadingMore && (
                    <div className="flex justify-center py-4">
                        <div className="flex items-center space-x-2 text-gray-500">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            <span className="text-sm">Loading more messages...</span>
                        </div>
                    </div>
                )}
                
                {/* Load More Button */}
                {hasMoreMessages && !loadingMore && messages.length > 0 && (
                    <div className="flex justify-center py-4">
                        <button
                            onClick={onLoadMore}
                            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            Load More Messages
                        </button>
                    </div>
                )}
                
                {/* Initial Loading Indicator */}
                {loading && messages.length === 0 && (
                    <div className="flex justify-center items-center py-12">
                        <div className="flex items-center space-x-2 text-gray-500">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="text-sm">Loading messages...</span>
                        </div>
                    </div>
                )}

                {(() => {
                    const groupedMessages = groupMessagesByDate(messages);
                    const dateOrder = ['Today', 'Yesterday'];
                    
                    // Sort dates: Older dates first, then Yesterday, then Today (oldest to newest)
                    const sortedDates = Object.keys(groupedMessages).sort((a, b) => {
                        if (dateOrder.includes(a) && dateOrder.includes(b)) {
                            return dateOrder.indexOf(b) - dateOrder.indexOf(a); // Reverse order
                        }
                        if (dateOrder.includes(a)) return 1; // Today/Yesterday go to end
                        if (dateOrder.includes(b)) return -1; // Today/Yesterday go to end
                        return new Date(a) - new Date(b); // Older dates first
                    });

                    return sortedDates.map(dateLabel => (
                        <div key={dateLabel}>
                            {/* Date Separator */}
                            <div className="flex justify-center my-6">
                                <span className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600 shadow-sm">
                                    {dateLabel}
                                </span>
                            </div>
                            
                            {/* Messages for this date - sort by creation time (oldest first) */}
                            {groupedMessages[dateLabel]
                                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                                .map((message) => (
                                <div key={message._id}>
                                    <MessageItem
                                        message={message}
                                        currentUser={currentUser}
                                        isSelected={selectedMessages.has(message._id)}
                                        onSelect={(selected) => {
                                            const newSelected = new Set(selectedMessages)
                                            if (selected) {
                                                newSelected.add(message._id)
                                            } else {
                                                newSelected.delete(message._id)
                                            }
                                            setSelectedMessages(newSelected)
                                        }}
                                        onEdit={(message) => {
                                            setLocalEditingMessage(message)
                                            onSetEditingMessage?.(message)
                                            setMessageText(message.text || '')
                                            messageInputRef.current?.focus()
                                        }}
                                        onDelete={onDeleteMessage}
                                    />
                                </div>
                            ))}
                        </div>
                    ));
                })()}
                
                {/* Typing Indicator */}
                {filteredTypingUsers.length > 0 && (
                    <div className="px-4 py-2">
                        <div className="flex items-center space-x-2 text-sm text-gray-500 bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span className="text-gray-600">
                                {filteredTypingUsers.length === 1 
                                    ? `${filteredTypingUsers[0][1]} is typing...` 
                                    : `${filteredTypingUsers.map(([id, name]) => name).join(', ')} are typing...`
                                }
                            </span>
                        </div>
                    </div>
                )}
                
                {/* Scroll to Bottom Button - Fixed position */}
                {showScrollButton && (
                    <div className="fixed bottom-20 right-6 z-50">
                        <button
                            onClick={() => {
                                scrollToBottom()
                                setNewMessagesCount(0)
                                setIsAtBottom(true)
                            }}
                            className="relative p-3 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 transition-all duration-200 hover:scale-105 border-2 border-white"
                            title="Scroll to bottom"
                        >
                            <ChevronDown className="w-5 h-5" />
                            {newMessagesCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-medium animate-pulse">
                                    {newMessagesCount > 9 ? '9+' : newMessagesCount}
                                </span>
                            )}
                        </button>
                    </div>
                )}
                
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
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
                                    setLocalEditingMessage(null)
                                    onSetEditingMessage?.(null)
                                    setMessageText('')
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
                                onChange={handleInputChange}
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
                                        {['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘'].map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => {
                                                    setMessageText(prev => prev + emoji)
                                                    setShowEmojiPicker(false)
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

        </div>
    )
}

export default ChatWindow