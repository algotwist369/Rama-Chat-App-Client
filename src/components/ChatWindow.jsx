import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';

// Custom hooks
import { 
    useSocketListeners, 
    useTypingIndicator, 
    useFileUpload, 
    useScrollManagement, 
    useMessageSelection 
} from '../hooks';

// Sub-components
import ChatHeader from './ChatWindow/ChatHeader';
import MessageSelectionBar from './ChatWindow/MessageSelectionBar';
import MessagesList from './ChatWindow/MessagesList';
import MessageInput from './ChatWindow/MessageInput';

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
    // State
    const [messageText, setMessageText] = useState('');
    const [localEditingMessage, setLocalEditingMessage] = useState(null);

    // Custom hooks
    const {
        onlineMembers,
        onlineCount,
        isRefreshingStatus,
        localTypingUsers,
        refreshMembers
    } = useSocketListeners(group, socketService);

    const { isTyping, handleInputChange, stopTyping } = useTypingIndicator(group, socketService);

    const {
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
        uploadFile,
        removeSelectedFile
    } = useFileUpload();

    const {
        showScrollButton,
        isAtBottom,
        newMessagesCount,
        messagesEndRef,
        messagesContainerRef,
        handleScroll,
        resetScroll,
        handleScrollToBottom
    } = useScrollManagement(messages, currentUser, hasMoreMessages, loadingMore, onLoadMore);

    const {
        selectedMessages,
        toggleMessageSelection,
        clearSelection,
        getSelectedCount,
        getSelectedMessageIds
    } = useMessageSelection();

    // Filter typing users to exclude current user
    const filteredTypingUsers = useMemo(() => {
        return Array.from(localTypingUsers.entries()).filter(([userId, username]) =>
            userId !== currentUser.id && userId !== currentUser._id
        );
    }, [localTypingUsers, currentUser.id]);

    // Set message text when editing
    useEffect(() => {
        if (editingMessage) {
            setMessageText(editingMessage.text);
        }
    }, [editingMessage]);

    // Reset scroll when group changes
    useEffect(() => {
        if (messages.length > 0) {
            resetScroll();
        }
    }, [group._id, resetScroll]);

    // Handle message submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        // If there's a selected file, upload it first
        if (selectedFile && !uploadingFile) {
            await uploadFile(group._id, onSendMessage);
            return;
        }

        if (!messageText.trim() && !selectedFile) return;

        if (editingMessage || localEditingMessage) {
            // Handle edit
            const messageToEdit = editingMessage || localEditingMessage;
            try {
                await onEditMessage(messageToEdit._id, messageText);
                setLocalEditingMessage(null);
                onSetEditingMessage?.(null);
                setMessageText('');
                toast.success('Message updated');
            } catch (error) {
                toast.error(error.response?.data?.error || 'Failed to update message');
            }
        } else {
            // Handle new message
            const messageData = {
                text: messageText.trim(),
                groupId: group._id
            };

            onSendMessage(messageData, (response) => {
                if (response.ok) {
                    setMessageText('');
                    if (isTyping) {
                        stopTyping();
                    }
                    // Ensure we're at bottom after sending
                    setTimeout(handleScrollToBottom, 100);
                }
            });
        }
    }, [selectedFile, uploadingFile, uploadFile, group._id, onSendMessage, messageText, editingMessage, localEditingMessage, onEditMessage, onSetEditingMessage, isTyping, stopTyping, handleScrollToBottom]);

    // Handle key down events
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    }, [handleSubmit]);

    // Handle message edit
    const handleEditMessage = useCallback((message) => {
        setLocalEditingMessage(message);
        onSetEditingMessage?.(message);
        setMessageText(message.text || '');
    }, [onSetEditingMessage]);

    // Handle delete selected messages
    const handleDeleteSelected = useCallback(() => {
        const messageIds = getSelectedMessageIds();
        onDeleteMultipleMessages(messageIds);
        clearSelection();
    }, [getSelectedMessageIds, onDeleteMultipleMessages, clearSelection]);

    // Debug logging for typing users
    if (localTypingUsers.size > 0) {
        console.log('ChatWindow - localTypingUsers:', Array.from(localTypingUsers.entries()));
        console.log('ChatWindow - filteredTypingUsers:', filteredTypingUsers);
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-50 h-full">
            <ChatHeader
                group={group}
                onlineCount={onlineCount}
                onlineMembers={onlineMembers}
                isRefreshingStatus={isRefreshingStatus}
                filteredTypingUsers={filteredTypingUsers}
                onRefreshMembers={refreshMembers}
                currentUser={currentUser}
            />

            <MessageSelectionBar
                selectedCount={getSelectedCount()}
                onDeleteSelected={handleDeleteSelected}
                onClearSelection={clearSelection}
            />

            <MessagesList
                messages={messages}
                currentUser={currentUser}
                loading={loading}
                loadingMore={loadingMore}
                hasMoreMessages={hasMoreMessages}
                onLoadMore={onLoadMore}
                selectedMessages={selectedMessages}
                onToggleMessageSelection={toggleMessageSelection}
                onEditMessage={handleEditMessage}
                onDeleteMessage={onDeleteMessage}
                onSetEditingMessage={onSetEditingMessage}
                filteredTypingUsers={filteredTypingUsers}
                showScrollButton={showScrollButton}
                newMessagesCount={newMessagesCount}
                onScrollToBottom={handleScrollToBottom}
                messagesContainerRef={messagesContainerRef}
                messagesEndRef={messagesEndRef}
                handleScroll={handleScroll}
            />

            <MessageInput
                group={group}
                messageText={messageText}
                setMessageText={setMessageText}
                editingMessage={editingMessage}
                localEditingMessage={localEditingMessage}
                onSetEditingMessage={onSetEditingMessage}
                selectedFile={selectedFile}
                uploadingFile={uploadingFile}
                uploadProgress={uploadProgress}
                dragActive={dragActive}
                fileInputRef={fileInputRef}
                getFileIcon={getFileIcon}
                formatFileSize={formatFileSize}
                handleDrag={handleDrag}
                handleDrop={handleDrop}
                handleFileSelect={handleFileSelect}
                removeSelectedFile={removeSelectedFile}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                handleKeyDown={handleKeyDown}
            />
        </div>
    );
};

export default ChatWindow;