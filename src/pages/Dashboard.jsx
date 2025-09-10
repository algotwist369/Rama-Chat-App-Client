
import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { groupApi } from '../api/groupApi'
import { messageApi } from '../api/messageApi'
import { notificationApi } from '../api/notificationApi'
import socketService from '../sockets/socket'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import NotificationPanel from '../components/NotificationPanel'
import toast from 'react-hot-toast'

const Dashboard = () => {
    const { user, token, logout } = useAuth()
    const [groups, setGroups] = useState([])
    const [selectedGroup, setSelectedGroup] = useState(null)
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMoreMessages, setHasMoreMessages] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [onlineUsers, setOnlineUsers] = useState(new Set())
    const [editingMessage, setEditingMessage] = useState(null)
    const [notificationPermission, setNotificationPermission] = useState('default')
    const [unreadCounts, setUnreadCounts] = useState({})
    const [totalUnreadCount, setTotalUnreadCount] = useState(0)
    const [notificationCount, setNotificationCount] = useState(0)
    
    // Debug notification count changes
    useEffect(() => {
        console.log('Dashboard notification count changed to:', notificationCount)
    }, [notificationCount])
    const [showNotificationPanel, setShowNotificationPanel] = useState(false)

    const messagesEndRef = useRef(null)

    // Save selected group to localStorage
    const saveSelectedGroup = (group) => {
        if (group) {
            localStorage.setItem('selectedGroup', JSON.stringify({
                _id: group._id,
                name: group.name,
                region: group.region
            }))
        } else {
            localStorage.removeItem('selectedGroup')
        }
    }

    // Restore selected group from localStorage
    const restoreSelectedGroup = (groups) => {
        try {
            const savedGroup = localStorage.getItem('selectedGroup')
            if (savedGroup) {
                const groupData = JSON.parse(savedGroup)
                // Find the group in the current groups list
                const foundGroup = groups.find(g => g._id === groupData._id)
                if (foundGroup) {
                    setSelectedGroup(foundGroup)
                    return foundGroup
                }
            }
        } catch (error) {
            console.error('Error restoring selected group:', error)
            localStorage.removeItem('selectedGroup')
        }
        return null
    }

    useEffect(() => {
        if (token) {
            // Clean up any existing listeners first
            socketService.removeAllListeners()
            
            const socket = socketService.connect(token)
            loadGroups()
            loadNotificationCount()
            requestNotificationPermission()
            
            console.log('Dashboard mounted, loading notification count...')

            // Set up socket event listeners
            const setupSocketListeners = () => {
                console.log('Setting up socket listeners...')
                socketService.on('message:new', handleNewMessage)
                socketService.on('message:edited', handleMessageEdited)
                socketService.on('message:deleted', handleMessageDeleted)
                socketService.on('messages:deleted', handleMultipleMessagesDeleted)
                socketService.on('message:delivered', handleMessageDelivered)
                socketService.on('message:seen', handleMessageSeen)
                // Typing indicators are now handled in ChatWindow component
                // Online status is handled by individual components (ChatWindow, AdminPanel)
                socketService.on('user:joined', handleUserJoined)
                socketService.on('user:left', handleUserLeft)
                socketService.on('notification:new', handleNewNotification)
                socketService.on('group:updated', handleGroupUpdated)
                socketService.on('group:joined', handleGroupJoined)
                socketService.on('group:left', handleGroupLeft)
                socketService.on('role:updated', handleRoleUpdated)
            }

            // Set up listeners immediately if socket is already connected
            if (socketService.getSocket()?.connected) {
                setupSocketListeners()
            } else {
                // Set up listeners when socket connects
                socketService.on('connect', () => {
                    console.log('Socket connected in Dashboard!')
                    setupSocketListeners()
                })
            }
            
            // Test socket connection
            console.log('Socket connected:', socketService.getSocket()?.connected)
            console.log('Socket ID:', socketService.getSocket()?.id)

            return () => {
                console.log('Dashboard cleanup - removing all socket listeners')
                // Clean up all listeners
                socketService.removeAllListeners()
                socketService.disconnect()
            }
        }
    }, [token])

    useEffect(() => {
        if (selectedGroup) {
            console.log('Joining group:', selectedGroup._id)
            loadMessages(selectedGroup._id, 1, true)
            // Join the group room for real-time updates
            socketService.joinGroup(selectedGroup._id)
        }
    }, [selectedGroup])

    const loadMoreMessages = async () => {
        if (selectedGroup && hasMoreMessages && !loadingMore) {
            const nextPage = currentPage + 1
            await loadMessages(selectedGroup._id, nextPage, false)
        }
    }

    // Mark messages as seen when group is selected
    useEffect(() => {
        if (selectedGroup && messages.length > 0) {
            const unreadMessageIds = messages
                .filter(msg => 
                    msg.groupId === selectedGroup._id && 
                    msg.senderId._id !== user.id &&
                    !msg.seenBy?.some(seenUser => seenUser._id === user.id || seenUser === user.id)
                )
                .map(msg => msg._id)
            
            if (unreadMessageIds.length > 0) {
                messageApi.markAsSeen(unreadMessageIds).catch(console.error)
            }
            
            // Clear unread count for selected group
            setUnreadCounts(prev => ({
                ...prev,
                [selectedGroup._id]: 0
            }))
        }
    }, [selectedGroup, messages, user.id])

    // Update total unread count
    useEffect(() => {
        const total = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)
        setTotalUnreadCount(total)
    }, [unreadCounts])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        
        // Mark messages as seen when scrolling to bottom
        if (selectedGroup && messages.length > 0) {
            const unreadMessageIds = messages
                .filter(msg => 
                    msg.groupId === selectedGroup._id && 
                    msg.senderId._id !== user.id &&
                    !msg.seenBy?.some(seenUser => seenUser._id === user.id || seenUser === user.id)
                )
                .map(msg => msg._id)
            
            if (unreadMessageIds.length > 0) {
                messageApi.markAsSeen(unreadMessageIds).catch(console.error)
            }
        }
    }

    const loadGroups = async () => {
        try {
            const response = await groupApi.getGroups()
            const groupsList = response.groups || []
            setGroups(groupsList)

            // First try to restore from localStorage
            const restoredGroup = restoreSelectedGroup(groupsList)
            
            // If no group was restored, try to set user's default group
            if (!restoredGroup && user.groupId && groupsList.length > 0) {
                const userGroup = groupsList.find(g => 
                    g._id === user.groupId || 
                    g.users?.includes(user.id) ||
                    g.managers?.some(m => m._id === user.id)
                )
                if (userGroup) {
                    setSelectedGroup(userGroup)
                    saveSelectedGroup(userGroup)
                }
            }
        } catch (error) {
            console.error('Groups loading error:', error)
            toast.error('Failed to load groups')
        } finally {
            setLoading(false)
        }
    }

    const loadMessages = async (groupId, page = 1, resetMessages = true) => {
        try {
            if (page === 1) {
                setLoading(true)
                setCurrentPage(1)
                setHasMoreMessages(true)
            } else {
                setLoadingMore(true)
            }

            const response = await messageApi.getMessages(groupId, { page, limit: 50 })
            const newMessages = response.messages || []
            
            if (page === 1 || resetMessages) {
                setMessages(newMessages)
            } else {
                // For pagination, add older messages to the beginning
                setMessages(prev => [...newMessages, ...prev])
            }
            
            // Check if there are more messages to load
            setHasMoreMessages(newMessages.length === 50)
            setCurrentPage(page)
            
        } catch (error) {
            console.error('Messages loading error:', error)
            toast.error('Failed to load messages')
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const handleNewMessage = (message) => {
        // Check if this message is already in the messages array to prevent duplicates
        setMessages(prev => {
            const messageExists = prev.some(msg => msg._id === message._id)
            if (messageExists) {
                console.log('Message already exists, skipping duplicate:', message._id)
                return prev
            }
            return [...prev, message]
        })

        // Mark as delivered if not from current user
        if (message.senderId._id !== user.id) {
            messageApi.markAsDelivered([message._id]).catch(console.error)
            
            // Update unread counts
            setUnreadCounts(prev => ({
                ...prev,
                [message.groupId]: (prev[message.groupId] || 0) + 1
            }))
            
            // Mark as seen if user is currently viewing this group
            if (selectedGroup && selectedGroup._id === message.groupId) {
                messageApi.markAsSeen([message._id]).catch(console.error)
                // Clear unread count for current group
                setUnreadCounts(prev => ({
                    ...prev,
                    [message.groupId]: 0
                }))
            }
            
            // Show notification for new messages
            if (document.hidden) {
                showNotification(
                    `New message from ${message.senderId.username}`,
                    message.text || 'Sent a file',
                    '/favicon.ico'
                )
            }
        }
    }

    const handleMessageEdited = (editedMessage) => {
        setMessages(prev =>
            prev.map(msg =>
                msg._id === editedMessage._id ? editedMessage : msg
            )
        )
    }

    const handleMessageDeleted = ({ messageId, deletedBy }) => {
        console.log('Message deleted event received:', { messageId, deletedBy })
        setMessages(prev => {
            const updatedMessages = prev.map(msg => {
                // Handle both string and ObjectId comparisons
                const msgId = msg._id.toString();
                const targetId = messageId.toString();
                
                if (msgId === targetId) {
                    console.log('Found message to mark as deleted:', msg)
                    return { 
                        ...msg, 
                        deleted: { 
                            isDeleted: true, 
                            deletedBy: deletedBy,
                            deletedAt: new Date()
                        } 
                    }
                }
                return msg
            })
            console.log('Updated messages after deletion:', updatedMessages.find(m => m._id.toString() === messageId.toString()))
            return updatedMessages
        })
    }

    const handleMultipleMessagesDeleted = ({ messageIds, deletedBy }) => {
        console.log('Multiple messages deleted event received:', { messageIds, deletedBy })
        setMessages(prev => {
            const updatedMessages = prev.map(msg => {
                const msgId = msg._id.toString();
                const isDeleted = messageIds.some(id => id.toString() === msgId);
                
                if (isDeleted) {
                    console.log('Found message to mark as deleted:', msg)
                    return { 
                        ...msg, 
                        deleted: { 
                            isDeleted: true, 
                            deletedBy: deletedBy,
                            deletedAt: new Date()
                        } 
                    }
                }
                return msg
            })
            return updatedMessages
        })
    }

    const handleMessageDelivered = ({ messageId, userId }) => {
        setMessages(prev =>
            prev.map(msg =>
                msg._id === messageId
                    ? { 
                        ...msg, 
                        deliveredTo: [...(msg.deliveredTo || []), userId],
                        status: 'delivered'
                      }
                    : msg
            )
        )
    }

    const handleMessageSeen = ({ messageId, userId }) => {
        setMessages(prev =>
            prev.map(msg =>
                msg._id === messageId
                    ? { 
                        ...msg, 
                        seenBy: [...(msg.seenBy || []), userId],
                        status: 'seen'
                      }
                    : msg
            )
        )
    }

    // Typing indicator handlers moved to ChatWindow component

    // Online status handlers removed - handled by individual components

    const handleUserJoined = ({ userId, username }) => {
        setOnlineUsers(prev => new Set([...prev, userId]))
        toast.success(`${username} joined the group`)
    }

    const handleUserLeft = ({ userId, username }) => {
        setOnlineUsers(prev => {
            const newSet = new Set(prev)
            newSet.delete(userId)
            return newSet
        })
        toast.info(`${username} left the group`)
    }

    const handleNewNotification = (notification) => {
        console.log('New notification received:', notification)
        console.log('Current notification count before increment:', notificationCount)
        
        // Increment notification count in real-time
        setNotificationCount(prev => {
            const newCount = prev + 1
            console.log('New notification count:', newCount)
            return newCount
        })
        
        // Show toast notification if not in the same group
        if (notification.groupId !== selectedGroup?._id) {
            toast.success(notification.title || 'New notification')
        }
    }

    const handleGroupUpdated = (data) => {
        console.log('Group updated:', data)
        const { group, action, user } = data
        
        // Update the groups list with the new group data
        setGroups(prevGroups => 
            prevGroups.map(g => g._id === group._id ? group : g)
        )
        
        // Update selected group if it's the one being updated
        if (selectedGroup && selectedGroup._id === group._id) {
            setSelectedGroup(group)
        }
        
        // Show appropriate toast message
        switch (action) {
            case 'user_added':
                toast.success(`${user.username} has been added to ${group.name}`)
                break
            case 'user_removed':
                toast.info(`${user.username} has been removed from ${group.name}`)
                break
            case 'manager_added':
                toast.success(`${user.username} has been promoted to manager in ${group.name}`)
                break
            case 'manager_removed':
                toast.info(`${user.username} is no longer a manager in ${group.name}`)
                break
        }
    }

    const handleGroupJoined = (data) => {
        console.log('User joined group:', data)
        const { group, message } = data
        
        // Add the new group to the user's groups list
        setGroups(prevGroups => {
            const exists = prevGroups.some(g => g._id === group._id)
            if (!exists) {
                return [...prevGroups, group]
            }
            return prevGroups.map(g => g._id === group._id ? group : g)
        })
        
        toast.success(message)
    }

    const handleGroupLeft = (data) => {
        console.log('User left group:', data)
        const { group, message } = data
        
        // Remove the group from the user's groups list
        setGroups(prevGroups => prevGroups.filter(g => g._id !== group._id))
        
        // If the user was viewing this group, clear the selection
        if (selectedGroup && selectedGroup._id === group._id) {
            setSelectedGroup(null)
            setMessages([])
            saveSelectedGroup(null)
        }
        
        toast.info(message)
    }

    const handleRoleUpdated = (data) => {
        console.log('Role updated:', data)
        const { group, newRole, message } = data
        
        // Update user's role in the context (if needed)
        // This would typically be handled by the auth context
        
        toast.success(message)
    }

    const handleEditMessage = async (messageId, newText) => {
        try {
            await messageApi.editMessage(messageId, newText)
            setEditingMessage(null)
            toast.success('Message updated successfully')
        } catch (error) {
            console.error('Edit message error:', error)
            toast.error('Failed to edit message')
        }
    }

    const handleDeleteMessage = async (messageId) => {
        if (window.confirm('Are you sure you want to delete this message?')) {
            try {
                console.log('Deleting message:', messageId)
                await messageApi.deleteMessage(messageId)
                toast.success('Message deleted successfully')
            } catch (error) {
                console.error('Delete message error:', error)
                toast.error('Failed to delete message')
            }
        }
    }

    const handleDeleteMultipleMessages = async (messageIds) => {
        if (window.confirm(`Are you sure you want to delete ${messageIds.length} messages?`)) {
            try {
                console.log('Deleting multiple messages:', messageIds)
                await messageApi.deleteMultipleMessages(messageIds)
                toast.success(`${messageIds.length} messages deleted successfully`)
            } catch (error) {
                console.error('Delete multiple messages error:', error)
                toast.error('Failed to delete messages')
            }
        }
    }

    // Test function to manually trigger socket event
    const testSocketEvent = () => {
        console.log('Testing socket event manually...')
        socketService.emit('test:event', { message: 'test' })
    }

    // Test function to simulate message deletion
    const testMessageDeletion = () => {
        if (messages.length > 0) {
            const testMessage = messages[0]
            console.log('Testing message deletion with:', testMessage._id)
            handleMessageDeleted({
                messageId: testMessage._id,
                deletedBy: { _id: 'test', username: 'Test User' }
            })
        } else {
            console.log('No messages to test deletion with')
        }
    }

    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission()
            setNotificationPermission(permission)
            return permission === 'granted'
        }
        return false
    }

    const showNotification = (title, body, icon) => {
        if (notificationPermission === 'granted') {
            new Notification(title, { body, icon })
        }
    }

    // Custom group selection handler that saves to localStorage
    const handleGroupSelect = (group) => {
        setSelectedGroup(group)
        saveSelectedGroup(group)
    }

    // Handle logout and clear selected group
    const handleLogout = () => {
        saveSelectedGroup(null) // Clear from localStorage
        logout()
    }

    const handleSendMessage = (messageData, callback) => {
        socketService.sendMessage(messageData, callback)
    }

    // Note: Join/Leave functionality removed as users can only see groups they're members of

    const handleNotificationClick = (notification) => {
        // Handle notification click - could navigate to specific group or message
        if (notification.groupId) {
            const group = groups.find(g => g._id === notification.groupId)
            if (group) {
                setSelectedGroup(group)
                saveSelectedGroup(group)
            }
        }
    }

    const loadNotificationCount = async () => {
        try {
            console.log('Loading notification count...')
            const response = await notificationApi.getNotifications()
            const count = response.notifications?.length || 0
            console.log('Notification count loaded:', count)
            console.log('Setting notification count to:', count)
            setNotificationCount(count)
        } catch (error) {
            console.error('Error loading notification count:', error)
            setNotificationCount(0)
        }
    }

    const handleNotificationPanelOpen = () => {
        setShowNotificationPanel(true)
        loadNotificationCount()
    }

    const handleNotificationCountChange = (newCount) => {
        console.log('Notification count changed from', notificationCount, 'to', newCount)
        setNotificationCount(newCount)
    }

    // Test function to manually set notification count
    const testNotificationCount = () => {
        console.log('Testing notification count...')
        setNotificationCount(5)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <Sidebar
                user={user}
                groups={groups}
                selectedGroup={selectedGroup}
                onlineUsers={onlineUsers}
                unreadCounts={unreadCounts}
                totalUnreadCount={totalUnreadCount}
                notificationCount={notificationCount}
                onGroupSelect={handleGroupSelect}
                onLogout={handleLogout}
                onNotificationClick={handleNotificationPanelOpen}
            />

            <div className="flex-1 flex flex-col min-h-0">
                {selectedGroup ? (
                        <ChatWindow
                            group={selectedGroup}
                            messages={messages}
                            currentUser={user}
                            editingMessage={editingMessage}
                            onSendMessage={handleSendMessage}
                            onEditMessage={handleEditMessage}
                            onDeleteMessage={handleDeleteMessage}
                            onDeleteMultipleMessages={handleDeleteMultipleMessages}
                            onSetEditingMessage={setEditingMessage}
                            onLoadMore={loadMoreMessages}
                            loading={loading}
                            loadingMore={loadingMore}
                            hasMoreMessages={hasMoreMessages}
                            socketService={socketService}
                        />
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-white min-h-0">
                        <div className="text-center max-w-md">
                            <div className="text-6xl mb-4">💬</div>
                            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                                Welcome to Ramavan Dashboard
                            </h2>
                            <p className="text-gray-500 mb-6">
                                {groups.length === 0 
                                    ? "You are not a member of any groups yet. Contact an admin to join groups."
                                    : "Select a group from the sidebar to start chatting"
                                }
                            </p>
                            
                            {/* Test button for notification count */}
                            <button
                                onClick={testNotificationCount}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
                            >
                                Test Notification Count (5)
                            </button>
                            
                            {/* Test button for socket connection */}
                            <button
                                onClick={testSocketEvent}
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mb-4 ml-2"
                            >
                                Test Socket Event
                            </button>
                            
                            {/* Test button for message deletion */}
                            <button
                                onClick={testMessageDeletion}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 mb-4 ml-2"
                            >
                                Test Message Deletion
                            </button>
                            
                            {groups.length > 0 && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                                    <h3 className="text-sm font-medium text-blue-900 mb-2">How to use groups:</h3>
                                    <ul className="text-xs text-blue-700 space-y-1">
                                        <li>• Click on any group from the sidebar to start chatting</li>
                                        <li>• You can see all groups you are a member of</li>
                                        <li>• Contact an admin to join additional groups</li>
                                        <li>• Managers have additional permissions in groups</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Notification Panel */}
            <NotificationPanel
                isOpen={showNotificationPanel}
                onClose={() => setShowNotificationPanel(false)}
                onNotificationClick={handleNotificationClick}
                onNotificationCountChange={handleNotificationCountChange}
            />
        </div>
    )
}

export default Dashboard