import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import MessageItem from '../MessageItem';
import { groupMessagesByDate } from '../../utils/formatDate';

const MessagesList = React.memo(({ 
    messages,
    currentUser,
    loading,
    loadingMore,
    hasMoreMessages,
    onLoadMore,
    selectedMessages,
    onToggleMessageSelection,
    onEditMessage,
    onDeleteMessage,
    onSetEditingMessage,
    filteredTypingUsers,
    showScrollButton,
    newMessagesCount,
    onScrollToBottom,
    messagesContainerRef,
    messagesEndRef,
    handleScroll
}) => {
    const groupedMessages = useMemo(() => {
        return groupMessagesByDate(messages);
    }, [messages]);

    const sortedDates = useMemo(() => {
        const dateOrder = ['Today', 'Yesterday'];
        return Object.keys(groupedMessages).sort((a, b) => {
            if (dateOrder.includes(a) && dateOrder.includes(b)) {
                return dateOrder.indexOf(b) - dateOrder.indexOf(a); // Reverse order
            }
            if (dateOrder.includes(a)) return 1; // Today/Yesterday go to end
            if (dateOrder.includes(b)) return -1; // Today/Yesterday go to end
            return new Date(a) - new Date(b); // Older dates first
        });
    }, [groupedMessages]);

    return (
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

            {/* Messages grouped by date */}
            {sortedDates.map(dateLabel => (
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
                                    if (selected) {
                                        selectedMessages.add(message._id);
                                    } else {
                                        selectedMessages.delete(message._id);
                                    }
                                    onToggleMessageSelection(message._id);
                                }}
                                onEdit={(message) => {
                                    onSetEditingMessage?.(message);
                                }}
                                onDelete={onDeleteMessage}
                            />
                        </div>
                    ))}
                </div>
            ))}
            
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
                        onClick={onScrollToBottom}
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
    );
});

MessagesList.displayName = 'MessagesList';

export default MessagesList;
