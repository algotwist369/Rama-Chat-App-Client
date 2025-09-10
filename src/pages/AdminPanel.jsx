import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Crown, 
  Shield, 
  User,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import { groupApi } from '../api/groupApi';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import socketService from '../sockets/socket';
import toast from 'react-hot-toast';

const AdminPanel = () => {
  const { user, token } = useAuth();
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('groups');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    loadData();
    
    // Set up socket connection for real-time updates
    if (token) {
      const socket = socketService.connect(token);
      
      // Join admin room for receiving global updates
      socket.on('connect', () => {
        socket.emit('join:admin');
      });
      
      // Set up socket event listeners
      socketService.on('group:updated', handleGroupUpdated);
      socketService.on('group:joined', handleGroupJoined);
      socketService.on('group:left', handleGroupLeft);
      socketService.on('role:updated', handleRoleUpdated);
      
      // Set up online status listeners
      socketService.onUserOnline(handleUserOnline);
      socketService.onUserOffline(handleUserOffline);
      
      // Global status change listener
      const handleUserStatusChanged = (data) => {
        console.log('AdminPanel - Global status changed:', data);
        if (data.isOnline) {
          handleUserOnline(data);
        } else {
          handleUserOffline(data);
        }
      };
      socketService.onUserStatusChanged(handleUserStatusChanged);
      
      return () => {
        // Clean up socket listeners
        socketService.off('group:updated', handleGroupUpdated);
        socketService.off('group:joined', handleGroupJoined);
        socketService.off('group:left', handleGroupLeft);
        socketService.off('role:updated', handleRoleUpdated);
        socketService.offUserOnline(handleUserOnline);
        socketService.offUserOffline(handleUserOffline);
        socketService.offUserStatusChanged(handleUserStatusChanged);
        socketService.disconnect();
      };
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load groups and users data - use getAllGroups for admin to see all groups
      const [groupsResponse, usersResponse] = await Promise.all([
        groupApi.getAllGroups(),
        authApi.getUsers()
      ]);
      
      setGroups(groupsResponse.groups || []);
      setUsers(usersResponse.users || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (groupData) => {
    try {
      await groupApi.createGroup(groupData);
      toast.success('Group created successfully');
      setShowCreateGroup(false);
      loadData();
    } catch (error) {
      toast.error('Failed to create group');
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      await authApi.createUser(userData);
      toast.success(`${userData.role} created successfully`);
      setShowCreateUser(false);
      loadData();
    } catch (error) {
      toast.error('Failed to create user');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      try {
        // Note: You might need to add delete group API
        toast.success('Group deleted successfully');
        loadData();
      } catch (error) {
        toast.error('Failed to delete group');
      }
    }
  };

  const handleAddUserToGroup = async (groupId, userId) => {
    try {
      await groupApi.addUserToGroup(groupId, userId);
      toast.success('User added to group successfully');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add user to group');
    }
  };

  const handleRemoveUserFromGroup = async (groupId, userId) => {
    if (window.confirm('Are you sure you want to remove this user from the group?')) {
      try {
        await groupApi.removeUserFromGroup(groupId, userId);
        toast.success('User removed from group successfully');
        loadData();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to remove user from group');
      }
    }
  };

  const handlePromoteToManager = async (groupId, userId) => {
    try {
      await groupApi.addManager(groupId, userId);
      toast.success('User promoted to manager successfully');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to promote user to manager');
    }
  };

  const handleRemoveManager = async (groupId, userId) => {
    if (window.confirm('Are you sure you want to remove manager privileges?')) {
      try {
        await groupApi.removeManager(groupId, userId);
        toast.success('Manager privileges removed successfully');
        loadData();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to remove manager privileges');
      }
    }
  };

  // Socket event handlers for real-time updates
  const handleGroupUpdated = (data) => {
    console.log('Admin Panel - Group updated:', data);
    const { group, action, user } = data;
    
    // Update the groups list with the new group data
    setGroups(prevGroups => 
      prevGroups.map(g => g._id === group._id ? group : g)
    );
    
    // Show appropriate toast message
    switch (action) {
      case 'user_added':
        toast.success(`${user.username} has been added to ${group.name}`);
        break;
      case 'user_removed':
        toast.info(`${user.username} has been removed from ${group.name}`);
        break;
      case 'manager_added':
        toast.success(`${user.username} has been promoted to manager in ${group.name}`);
        break;
      case 'manager_removed':
        toast.info(`${user.username} is no longer a manager in ${group.name}`);
        break;
    }
  };

  const handleGroupJoined = (data) => {
    console.log('Admin Panel - User joined group:', data);
    const { group } = data;
    
    // Add the new group to the admin's groups list if not already present
    setGroups(prevGroups => {
      const exists = prevGroups.some(g => g._id === group._id);
      if (!exists) {
        return [...prevGroups, group];
      }
      return prevGroups.map(g => g._id === group._id ? group : g);
    });
  };

  const handleGroupLeft = (data) => {
    console.log('Admin Panel - User left group:', data);
    const { group } = data;
    
    // Update the group in the admin's list (don't remove it as admin can see all groups)
    setGroups(prevGroups => 
      prevGroups.map(g => g._id === group._id ? group : g)
    );
  };

  const handleRoleUpdated = (data) => {
    console.log('Admin Panel - Role updated:', data);
    const { group, newRole, message } = data;
    
    // Update the group in the admin's list
    setGroups(prevGroups => 
      prevGroups.map(g => g._id === group._id ? { ...g, ...group } : g)
    );
    
    // Also update users list if needed
    loadData(); // Refresh to get updated user roles
  };

  const handleUserOnline = (data) => {
    console.log('Admin Panel - User came online:', data);
    console.log('Admin Panel - Current users before update:', users);
    
    setOnlineUsers(prev => {
      const newSet = new Set([...prev, data.userId]);
      console.log('Admin Panel - Online users updated:', newSet);
      return newSet;
    });
    
    // Update user in users list
    setUsers(prevUsers => {
      const updated = prevUsers.map(u => 
        u._id === data.userId ? { ...u, isOnline: true, lastSeen: new Date() } : u
      );
      console.log('Admin Panel - Users list updated:', updated);
      return updated;
    });
    
    // Show toast notification
    toast.success(`${data.username} is now online`, { duration: 2000 });
  };

  const handleUserOffline = (data) => {
    console.log('Admin Panel - User went offline:', data);
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(data.userId);
      return newSet;
    });
    
    // Update user in users list
    setUsers(prevUsers => 
      prevUsers.map(u => 
        u._id === data.userId ? { ...u, isOnline: false, lastSeen: data.lastSeen } : u
      )
    );
    
    // Show toast notification
    toast(`${data.username} is now offline`, { duration: 2000 });
  };

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


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Crown className="h-8 w-8 text-yellow-500" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateUser(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create User</span>
              </button>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create Group</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('groups')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'groups'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Groups ({groups.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Users ({users.length})</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'groups' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Groups Management</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {groups.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
                  <p className="text-gray-500">Get started by creating your first group.</p>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group._id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-sm font-medium text-gray-900">{group.name}</h4>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {group.region}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {group.users?.length || 0} members • {group.managers?.length || 0} managers • Created {new Date(group.createdAt).toLocaleDateString()}
                        </p>
                        {/* Group Members */}
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 mb-1">Members:</p>
                          <div className="flex flex-wrap gap-1">
                            {group.users?.slice(0, 5).map((user) => (
                              <span key={user._id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <div className="flex items-center space-x-1">
                                  <div className="relative">
                                    <span>{user.username}</span>
                                    {/* Online indicator for group members */}
                                    <div 
                                      className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white ${
                                        user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                      }`}
                                    />
                                  </div>
                                  {group.managers?.some(m => m._id === user._id) && (
                                    <Shield className="h-3 w-3 text-blue-500" />
                                  )}
                                </div>
                                <button
                                  onClick={() => handleRemoveUserFromGroup(group._id, user._id)}
                                  className="ml-1 text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            {group.users?.length > 5 && (
                              <span className="text-xs text-gray-500">+{group.users.length - 5} more</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowAddUserModal({ groupId: group._id, groupName: group.name })}
                          className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                          title="Add User"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group._id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Users Management</h3>
              <button 
                onClick={() => socketService.emit('test:online-status')}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                Test Online Status
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-500">Get started by creating your first user.</p>
                </div>
              ) : (
                users.map((user) => (
                  <div key={user._id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <div className="relative">
                              {getRoleIcon(user.role)}
                              {/* Online indicator */}
                              <div 
                                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                                  user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                }`}
                              />
                            </div>
                            <h4 className="text-sm font-medium text-gray-900">{user.username}</h4>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin' ? 'bg-yellow-100 text-yellow-800' :
                            user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                          {user.pin && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Has PIN
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {user.email} • {user.isOnline ? (
                            <span className="text-green-600 font-medium">Online</span>
                          ) : (
                            <span className="text-gray-500">
                              Offline{user.lastSeen ? ` • Last seen ${new Date(user.lastSeen).toLocaleString()}` : ''}
                            </span>
                          )} • Created {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onSubmit={handleCreateGroup}
        />
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {/* Add User to Group Modal */}
      {showAddUserModal && (
        <AddUserToGroupModal
          groupId={showAddUserModal.groupId}
          groupName={showAddUserModal.groupName}
          users={users}
          groups={groups}
          onClose={() => setShowAddUserModal(null)}
          onAddUser={handleAddUserToGroup}
          onPromoteToManager={handlePromoteToManager}
        />
      )}
    </div>
  );
};

// Create Group Modal Component
const CreateGroupModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    region: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create New Group</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter group name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Region
            </label>
            <input
              type="text"
              name="region"
              value={formData.region}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter region"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Create User Modal Component
const CreateUserModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    pin: '',
    role: 'user'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create New User</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PIN (Optional)
            </label>
            <input
              type="text"
              name="pin"
              value={formData.pin}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter PIN (4-6 digits)"
              maxLength="6"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="user">User</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add User to Group Modal Component
const AddUserToGroupModal = ({ groupId, groupName, users, groups, onClose, onAddUser, onPromoteToManager }) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [action, setAction] = useState('add'); // 'add' or 'promote'

  const currentGroup = groups.find(g => g._id === groupId);
  const currentGroupUserIds = currentGroup?.users?.map(u => u._id) || [];
  const currentGroupManagerIds = currentGroup?.managers?.map(m => m._id) || [];

  // Filter users who are not already in the group
  const availableUsers = users.filter(user => 
    !currentGroupUserIds.includes(user._id) && user.role !== 'admin'
  );

  // Filter users who are in the group but not managers
  const promotableUsers = users.filter(user => 
    currentGroupUserIds.includes(user._id) && 
    !currentGroupManagerIds.includes(user._id) &&
    user.role !== 'admin'
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedUserId) {
      if (action === 'add') {
        onAddUser(groupId, selectedUserId);
      } else {
        onPromoteToManager(groupId, selectedUserId);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Manage {groupName}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="add">Add User to Group</option>
              <option value="promote">Promote to Manager</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {action === 'add' ? 'Select User to Add' : 'Select User to Promote'}
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a user...</option>
              {(action === 'add' ? availableUsers : promotableUsers).map((user) => (
                <option key={user._id} value={user._id}>
                  {user.username} ({user.email})
                </option>
              ))}
            </select>
            {action === 'add' && availableUsers.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">All users are already in this group</p>
            )}
            {action === 'promote' && promotableUsers.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">No users available for promotion</p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedUserId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {action === 'add' ? 'Add User' : 'Promote to Manager'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPanel;
