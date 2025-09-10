import { useEffect, useState } from 'react';
import { groupApi } from '../api/groupApi';
import toast from 'react-hot-toast';

export const useSocketListeners = (group, socketService) => {
    const [onlineMembers, setOnlineMembers] = useState([]);
    const [onlineCount, setOnlineCount] = useState(0);
    const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
    const [localTypingUsers, setLocalTypingUsers] = useState(new Map());

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
                const memberExists = prev.some(member => 
                    member._id === data.userId || member._id.toString() === data.userId.toString()
                );
                
                if (memberExists) {
                    const updated = prev.map(member => 
                        (member._id === data.userId || member._id.toString() === data.userId.toString())
                            ? { ...member, isOnline: true, lastSeen: new Date() }
                            : member
                    );
                    console.log('ChatWindow - Updated existing member to online:', updated);
                    return updated;
                } else {
                    // If member doesn't exist in current list, add them
                    const newMember = {
                        _id: data.userId,
                        username: data.username,
                        isOnline: true,
                        lastSeen: new Date()
                    };
                    const updated = [...prev, newMember];
                    console.log('ChatWindow - Added new online member:', updated);
                    return updated;
                }
            });
            
            setOnlineCount(prev => {
                const newCount = prev + 1;
                console.log('ChatWindow - Online count updated from', prev, 'to', newCount);
                return newCount;
            });
        };

        const handleUserOffline = (data) => {
            console.log('ChatWindow - User went offline:', data);
            setOnlineMembers(prev => 
                prev.map(member => 
                    (member._id === data.userId || member._id.toString() === data.userId.toString())
                        ? { ...member, isOnline: false, lastSeen: data.lastSeen }
                        : member
                )
            );
            setOnlineCount(prev => Math.max(0, prev - 1));
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
            if (group && groupId && groupId.toString() === group._id.toString()) {
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
            if (group && groupId && groupId.toString() === group._id.toString()) {
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
    }, [group?._id, socketService]);

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
    }, [group?._id]);

    const refreshMembers = async () => {
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
    };

    return {
        onlineMembers,
        onlineCount,
        isRefreshingStatus,
        localTypingUsers,
        refreshMembers
    };
};
