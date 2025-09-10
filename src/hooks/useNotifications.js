import { useState, useEffect, useCallback } from 'react';
import { notificationApi } from '../api/notificationApi';
import toast from 'react-hot-toast';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationApi.getNotifications();
      const notificationList = response.notifications || [];
      setNotifications(notificationList);
      setNotificationCount(notificationList.length);
      console.log('Notifications loaded, count set to:', notificationList.length);
      return notificationList;
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const markNotificationsAsSeen = useCallback(async () => {
    try {
      console.log('Marking notifications as seen...');
      await notificationApi.markAsSeen();
      console.log('Notifications marked as seen successfully');
    } catch (error) {
      console.error('Error marking notifications as seen:', error);
      toast.error('Failed to mark notifications as seen');
    }
  }, []);

  const clearAllNotifications = useCallback(async () => {
    try {
      await notificationApi.clearNotifications();
      setNotifications([]);
      setNotificationCount(0);
      console.log('Notifications cleared, count set to 0');
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
    }
  }, []);

  const createTestNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast.success('Test notifications created');
        await loadNotifications(); // Reload notifications
      } else {
        toast.error('Failed to create test notifications');
      }
    } catch (error) {
      console.error('Error creating test notifications:', error);
      toast.error('Failed to create test notifications');
    } finally {
      setLoading(false);
    }
  }, [loadNotifications]);

  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n._id !== notificationId);
      setNotificationCount(updated.length);
      console.log('Notification removed, new count:', updated.length);
      return updated;
    });
  }, []);

  const handleNotificationClick = useCallback((notification, onNotificationClick, onClose) => {
    console.log('Notification clicked:', notification);
    
    // Remove the clicked notification from the local list
    removeNotification(notification._id);
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    
    // Close the panel after a short delay to allow navigation
    setTimeout(() => {
      if (onClose) onClose();
    }, 100);
  }, [removeNotification]);

  return {
    notifications,
    loading,
    notificationCount,
    loadNotifications,
    markNotificationsAsSeen,
    clearAllNotifications,
    createTestNotifications,
    removeNotification,
    handleNotificationClick
  };
};
