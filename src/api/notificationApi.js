import axiosInstance from './axiosInstance';

export const notificationApi = {
    // Get user notifications
    getNotifications: async () => {
        const response = await axiosInstance.get('/notifications');
        return response.data;
    },

    // Mark notifications as seen
    markAsSeen: async () => {
        console.log('Making PATCH request to /notifications/seen');
        try {
            const response = await axiosInstance.patch('/notifications/seen');
            console.log('PATCH /notifications/seen response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error in PATCH /notifications/seen:', error);
            throw error;
        }
    },

    // Clear all notifications
    clearNotifications: async () => {
        const response = await axiosInstance.delete('/notifications');
        return response.data;
    }
};
