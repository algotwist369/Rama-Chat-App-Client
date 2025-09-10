import React, { useState } from 'react';
import { 
  Edit, 
  Trash2, 
  Forward, 
  Check, 
  CheckCheck,
  Download,
  Image as ImageIcon,
  File,
  FileText,
  Music,
  Video,
  Archive,
  Eye
} from 'lucide-react';
import { formatMessageTime } from '../utils/formatDate';

const MessageItem = ({
  message,
  currentUser,
  isSelected,
  onSelect,
  onEdit,
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isOwnMessage = message.senderId._id === currentUser.id;
  const isDeleted = message.deleted?.isDeleted;
  const isEdited = message.edited?.isEdited;

  const getStatusIcon = () => {
    if (isOwnMessage) {
      // Check if current user has seen the message
      const isSeenByCurrentUser = message.seenBy?.some(user => user._id === currentUser.id || user === currentUser.id);
      const isDeliveredToCurrentUser = message.deliveredTo?.some(user => user._id === currentUser.id || user === currentUser.id);
      
      if (isSeenByCurrentUser) {
        return <CheckCheck className="h-4 w-4 text-blue-500" title="Read" />;
      } else if (isDeliveredToCurrentUser || message.deliveredTo?.length > 0) {
        return <CheckCheck className="h-4 w-4 text-gray-400" title="Delivered" />;
      } else {
        return <Check className="h-4 w-4 text-gray-400" title="Sent" />;
      }
    }
    return null;
  };

  const handleFileDownload = (file) => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-green-500" />;
    } else if (fileType?.startsWith('video/')) {
      return <Video className="h-5 w-5 text-purple-500" />;
    } else if (fileType?.startsWith('audio/')) {
      return <Music className="h-5 w-5 text-pink-500" />;
    } else if (fileType?.includes('pdf') || fileType?.includes('document')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (fileType?.includes('zip') || fileType?.includes('rar')) {
      return <Archive className="h-5 w-5 text-yellow-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 group`}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        {/* Sender info for other messages */}
        {!isOwnMessage && (
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-medium">
              {message.senderId.username?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-600 font-medium">
              {message.senderId.username}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`relative px-4 py-2 rounded-2xl ${
            isOwnMessage
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          } ${isDeleted ? 'opacity-50' : ''}`}
        >
          {/* Deleted message */}
          {isDeleted ? (
            <div className="flex items-center space-x-2 text-gray-500 italic">
              <Trash2 className="h-4 w-4" />
              <span>
                {message.deleted?.deletedBy && 
                 (typeof message.deleted.deletedBy === 'object' 
                   ? message.deleted.deletedBy._id !== message.senderId._id
                   : message.deleted.deletedBy !== message.senderId._id)
                  ? `This message was deleted by ${typeof message.deleted.deletedBy === 'object' 
                      ? message.deleted.deletedBy.username || 'someone'
                      : 'someone'}`
                  : 'This message was deleted'
                }
              </span>
            </div>
          ) : (
            <>
              {/* Text message */}
              {message.text && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.text}
                </p>
              )}

              {/* File message */}
              {message.file && (
                <div className="mt-2">
                  {/* File card */}
                  <div
                    onClick={() => handleFileDownload(message.file)}
                    className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                      isOwnMessage 
                        ? 'bg-white bg-opacity-25 hover:bg-opacity-35' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {/* File icon */}
                    <div className="flex-shrink-0">
                      {getFileIcon(message.file.mimetype)}
                    </div>
                    
                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium truncate ${
                          isOwnMessage ? 'text-white' : 'text-gray-900'
                        }`}>
                          {message.file.originalname || 'File'}
                        </p>
                        <div className="flex items-center space-x-1 ml-2">
                          <Eye className={`h-4 w-4 ${
                            isOwnMessage ? 'text-white text-opacity-70' : 'text-gray-500'
                          }`} />
                        </div>
                      </div>
                      {message.file.size && (
                        <p className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-white text-opacity-70' : 'text-gray-500'
                        }`}>
                          {formatFileSize(message.file.size)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Image preview */}
                  {message.file.mimetype?.startsWith('image/') && message.file.url && (
                    <div className="mt-3">
                      <div className="relative group">
                        <img
                          src={message.file.url}
                          alt="Shared image"
                          className="max-w-full h-auto rounded-xl cursor-pointer shadow-lg hover:shadow-xl transition-shadow duration-200"
                          onClick={() => window.open(message.file.url, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-xl transition-all duration-200 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Eye className="h-8 w-8 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Video preview */}
                  {message.file.mimetype?.startsWith('video/') && message.file.url && (
                    <div className="mt-3">
                      <div className="relative group">
                        <video
                          src={message.file.url}
                          className="max-w-full h-auto rounded-xl cursor-pointer shadow-lg hover:shadow-xl transition-shadow duration-200"
                          controls
                          preload="metadata"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit indicator */}
              {isEdited && (
                <span className="text-xs opacity-75 italic">(edited)</span>
              )}
            </>
          )}

          {/* Message menu */}
          {showMenu && !isDeleted && (
            <div className={`absolute top-0 ${isOwnMessage ? 'left-0' : 'right-0'} transform -translate-y-full mb-2`}>
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex items-center space-x-1">
                {isOwnMessage && (
                  <>
                    <button
                      onClick={() => onEdit(message)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit message"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(message._id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete message"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                  title="Forward message"
                >
                  <Forward className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message metadata */}
        <div className={`flex items-center space-x-2 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-500">
            {formatMessageTime(message.createdAt)}
          </span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
