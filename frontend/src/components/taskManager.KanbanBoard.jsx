import { useState } from 'react';
import { FiMoreVertical, FiCalendar, FiUser, FiTag, FiEdit2, FiTrash2, FiX, FiDollarSign } from 'react-icons/fi';
import api from '../utils/taskManager.api';

const KanbanBoard = ({ tasks, onTaskUpdate, onTaskClick, onEditTask, onDeleteTask, canDeleteTask }) => {
  const [draggedTask, setDraggedTask] = useState(null);

  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
    { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100' },
    { id: 'in-review', title: 'In Review', color: 'bg-purple-100' },
    { id: 'done', title: 'Done', color: 'bg-green-100' },
  ];

  const getTasksByStatus = (status) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      try {
        await api.put(`/tasks/${draggedTask._id}`, { status: newStatus });
        onTaskUpdate();
      } catch (error) {
        console.error('Error updating task status:', error);
      }
    }
    setDraggedTask(null);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-200 text-gray-700',
      medium: 'bg-yellow-200 text-yellow-800',
      high: 'bg-orange-200 text-orange-800',
      urgent: 'bg-red-200 text-red-800',
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id);
        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-64 sm:w-72 lg:w-80"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className={`${column.color} rounded-lg p-2 sm:p-4 mb-2 sm:mb-4`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-semibold text-gray-800">{column.title}</h3>
                <span className="bg-white bg-opacity-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                  {columnTasks.length}
                </span>
              </div>
            </div>
            <div className="space-y-2 sm:space-y-3 min-h-[300px] sm:min-h-[400px]">
              {columnTasks.map((task) => (
                <div
                  key={task._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onClick={() => onTaskClick(task)}
                  className="bg-white rounded-lg shadow-md p-2.5 sm:p-4 cursor-move hover:shadow-lg transition-all border border-gray-200 hover:border-primary-300"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4
                      className="text-sm sm:text-base font-semibold text-gray-900 flex-1 pr-2 cursor-pointer hover:text-primary-600 transition-colors"
                      onClick={() => onTaskClick(task)}
                    >
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {onEditTask && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTask(task);
                          }}
                          className="text-gray-400 hover:text-primary-600 transition-colors"
                          title="Edit task"
                        >
                          <FiEdit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      )}
                      {onDeleteTask && (!canDeleteTask || canDeleteTask(task)) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Let parent handle confirmation and deletion
                            onDeleteTask(task._id);
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete task"
                        >
                          <FiTrash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <span
                      className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                    {task.isBillable ? (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        <FiDollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        Billable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
                        <FiDollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-50" />
                        Non-Billable
                      </span>
                    )}
                    {task.tags && task.tags.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                        <FiTag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        {task.tags[0]}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    {task.assignedTo && (
                      <div className="flex items-center gap-1">
                        <FiUser className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="truncate max-w-[60px] sm:max-w-[100px]">
                          {task.assignedTo.name || 'Unassigned'}
                        </span>
                      </div>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <FiCalendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="text-xs">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {columnTasks.length === 0 && (
                <div className="text-center text-gray-400 py-6 sm:py-8 text-xs sm:text-sm">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;

