import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Trash2, 
  MessageCircle, 
  Users, 
  UserPlus, 
  UserMinus,
  Clock
} from 'lucide-react';
import { formatMessageTime } from '../utils/formatDate';
import { notificationApi } from '../api/notificationApi';
import toast from 'react-hot-toast';

const NotificationPanel = ({ isOpen, onClose, onNotificationClick, onNotificationCountChange }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      // Don't mark notifications as seen when panel opens - only when clicked
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationApi.getNotifications();
      setNotifications(response.notifications || []);
      // Update notification count in parent component
      if (onNotificationCountChange) {
        onNotificationCountChange(response.notifications?.length || 0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markNotificationsAsSeen = async () => {
    try {
      console.log('Marking notifications as seen...');
      // Call API to mark notifications as seen
      await notificationApi.markAsSeen();
      console.log('Notifications marked as seen');
      
      // Update notification count to 0 since all are now seen
      if (onNotificationCountChange) {
        onNotificationCountChange(0);
      }
    } catch (error) {
      console.error('Error marking notifications as seen:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationApi.clearNotifications();
      setNotifications([]);
      // Update notification count in parent component
      if (onNotificationCountChange) {
        onNotificationCountChange(0);
      }
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
    }
  };

  const handleCreateTestNotifications = async () => {
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
        loadNotifications(); // Reload notifications
      } else {
        toast.error('Failed to create test notifications');
      }
    } catch (error) {
      console.error('Error creating test notifications:', error);
      toast.error('Failed to create test notifications');
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'user_joined':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'user_left':
        return <UserMinus className="h-4 w-4 text-red-500" />;
      case 'group_update':
        return <Users className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'message':
        return 'bg-blue-50 border-blue-200';
      case 'user_joined':
        return 'bg-green-50 border-green-200';
      case 'user_left':
        return 'bg-red-50 border-red-200';
      case 'group_update':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const handleNotificationClick = (notification) => {
    console.log('Notification clicked:', notification);
    
    // Remove the clicked notification from the local list
    setNotifications(prev => {
      const updated = prev.filter(n => n._id !== notification._id);
      // Update notification count
      if (onNotificationCountChange) {
        onNotificationCountChange(updated.length);
      }
      return updated;
    });
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    // Close the panel after a short delay to allow navigation
    setTimeout(() => {
      onClose();
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-30 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            {notifications.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {notifications.length === 0 && (
              <button
                onClick={handleCreateTestNotifications}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded"
                title="Create test notifications"
              >
                Test
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Clear all notifications"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-h-[calc(100vh-100px)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
              <p className="text-sm text-gray-500">You're all caught up!</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {notifications.map((notification, index) => (
                <div
                  key={index}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 rounded-lg border cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 ${getNotificationColor(notification.type)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatMessageTime(notification.createdAt)}</span>
                        </div>
                      </div>
                      {notification.message && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      {notification.groupName && (
                        <p className="text-xs text-gray-500 mt-1">
                          in {notification.groupName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
