import React, { useState, useEffect } from 'react';
import { 
  Users, 
  LogOut, 
  Settings, 
  Plus, 
  Search,
  Crown,
  Shield,
  User,
  Bell
} from 'lucide-react';
import { formatLastSeen } from '../utils/formatDate';

const Sidebar = ({
  user,
  groups,
  selectedGroup,
  onlineUsers,
  unreadCounts,
  totalUnreadCount,
  notificationCount,
  onGroupSelect,
  onLogout,
  onNotificationClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Debug notification count
  console.log('Sidebar notificationCount:', notificationCount);
  
  // Debug notification count changes
  useEffect(() => {
    console.log('Sidebar notification count changed to:', notificationCount);
  }, [notificationCount]);

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'manager':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-yellow-100 text-yellow-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900">Ramavan</h1>
          <div className="flex items-center space-x-1">
            {/* Notification Icon */}
            <button
              onClick={onNotificationClick}
              className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium min-w-[20px] animate-pulse">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Create Group"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
          />
        </div>
      </div>

      {/* Groups List */}
      <div className="flex-1 bg-white overflow-hidden">
        <div className="p-3 h-full flex flex-col">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1 flex-shrink-0">
            Available Groups ({filteredGroups.length})
          </h2>
          
          <div className="flex-1 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">
                  {searchTerm ? 'No groups found' : 'No groups available'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {searchTerm ? 'Try a different search term' : 'You are not a member of any groups yet. Contact an admin to join groups.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
              {filteredGroups.map((group) => {
                const isManager = group.managers?.some(m => m._id === user.id);
                
                return (
                  <div
                    key={group._id}
                    onClick={() => onGroupSelect(group)}
                    className={`p-3 rounded-lg transition-all duration-200 ${
                      selectedGroup?._id === group._id
                        ? 'bg-blue-50 border border-blue-200 cursor-pointer shadow-sm'
                        : 'bg-green-50 border border-green-200 cursor-pointer hover:bg-green-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {group.name}
                          </h3>
                          {isManager && (
                            <Shield className="h-3 w-3 text-blue-500 flex-shrink-0" title="Manager" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <p className="text-xs text-gray-500 truncate">
                            {group.region} • {group.users?.length || 0} members
                          </p>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                            Member
                          </span>
                        </div>
                      </div>
                      
                      {/* Online indicator and notifications */}
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        {/* Unread count badge */}
                        {unreadCounts[group._id] > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium min-w-[20px]">
                            {unreadCounts[group._id] > 99 ? '99+' : unreadCounts[group._id]}
                          </span>
                        )}
                        
                        {/* Online indicators */}
                        <div className="flex items-center space-x-0.5">
                          {group.users?.slice(0, 3).map((userId) => (
                            <div
                              key={userId}
                              className={`w-2 h-2 rounded-full ${
                                onlineUsers.has(userId) ? 'bg-green-400' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                          {group.users?.length > 3 && (
                            <span className="text-xs text-gray-400 ml-1">
                              +{group.users.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Click to chat indicator */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Click to chat</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center space-x-3 mb-3">
          <div className="relative">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              user?.isOnline ? 'bg-green-400' : 'bg-gray-300'
            }`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {user?.username}
              </h3>
              {getRoleIcon(user?.role)}
            </div>
            <p className="text-xs text-gray-500">
              {user?.isOnline ? 'Online' : `Last seen ${formatLastSeen(user?.lastSeen)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user?.role)}`}>
            {user?.role}
          </span>
          
          <div className="flex items-center space-x-1">
            <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={onLogout}
              className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
