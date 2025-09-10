import React, { useState } from 'react';
import { Users } from 'lucide-react';

const ChatHeader = React.memo(({ 
    group, 
    onlineCount, 
    onlineMembers, 
    isRefreshingStatus, 
    filteredTypingUsers,
    onRefreshMembers,
    currentUser
}) => {
    const [showMembersList, setShowMembersList] = useState(false);

    return (
        <>
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
                                onClick={onRefreshMembers}
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
                                        {member._id === currentUser?.id && (
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
        </>
    );
});

ChatHeader.displayName = 'ChatHeader';

export default ChatHeader;
