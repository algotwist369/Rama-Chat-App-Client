import axiosInstance from './axiosInstance';

export const groupApi = {
  getGroups: async () => {
    const response = await axiosInstance.get('/groups');
    return response.data;
  },

  getAllGroups: async () => {
    const response = await axiosInstance.get('/groups/all');
    return response.data;
  },

  getGroupById: async (groupId) => {
    const response = await axiosInstance.get(`/groups/${groupId}`);
    return response.data;
  },

  getGroupMembers: async (groupId) => {
    const response = await axiosInstance.get(`/groups/${groupId}/members`);
    return response.data;
  },

  createGroup: async (groupData) => {
    const response = await axiosInstance.post('/groups', groupData);
    return response.data;
  },

  joinGroup: async (groupId) => {
    const response = await axiosInstance.post(`/groups/${groupId}/join`);
    return response.data;
  },

  leaveGroup: async (groupId) => {
    const response = await axiosInstance.post(`/groups/${groupId}/leave`);
    return response.data;
  },

  addManager: async (groupId, userId) => {
    const response = await axiosInstance.post(`/groups/${groupId}/managers/${userId}`);
    return response.data;
  },

  removeManager: async (groupId, userId) => {
    const response = await axiosInstance.delete(`/groups/${groupId}/managers/${userId}`);
    return response.data;
  },

  addUserToGroup: async (groupId, userId) => {
    const response = await axiosInstance.post(`/groups/${groupId}/users/${userId}`);
    return response.data;
  },

  removeUserFromGroup: async (groupId, userId) => {
    const response = await axiosInstance.delete(`/groups/${groupId}/users/${userId}`);
    return response.data;
  }
};
