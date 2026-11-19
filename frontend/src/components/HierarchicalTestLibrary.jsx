import React, { useEffect, useState } from "react";
import {
  Modal,
  Card,
  List,
  Tag,
  Space,
  Select,
  Alert,
  Spin,
  Empty,
  message,
  Button,
} from "antd";
import {
  FileTextOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import axiosClient from "../api/axiosClient";

/**
 * Hierarchical Test Library Modal
 * Displays tests organized by Unit → Set → Test Type
 */
const HierarchicalTestLibrary = ({ visible, onCancel, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [hierarchy, setHierarchy] = useState([]); // Array of units
  const [selectedTest, setSelectedTest] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    if (visible) {
      fetchTestLibrary();
      fetchGroups();
    }
  }, [visible]);

  const fetchTestLibrary = async () => {
    setLoading(true);
    try {
      const resp = await axiosClient.get('/exams/imported/hierarchy');
      setHierarchy(resp.data);
    } catch (error) {
      console.error("Error fetching test library:", error);
      message.error("Failed to load test library");
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const resp = await axiosClient.get('/admin/groups');
      setGroups(resp.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  /**
   * Helper function to assign a single test to a group
   * Handles creating the exam and copying all questions
   */
  const assignSingleTest = async (testId, groupId) => {
    // Fetch full exam details with questions
    const fullExamResp = await axiosClient.get(`/exams/${testId}`);
    const fullExam = fullExamResp.data;

    // Clone the test
    const formData = {
      title: fullExam.title,
      description: fullExam.description,
      subject_id: fullExam.subject_id,
      group_id: groupId,
      total_points: fullExam.total_points,
      duration_minutes: fullExam.duration_minutes,
      passing_score: fullExam.passing_score,
      auto_grade: true,
      show_answers: true,
      is_imported: true, // Keep track
      custom_data: fullExam.custom_data // Keep metadata
    };

    const resp = await axiosClient.post('/exams', formData);

    // Copy questions
    if (fullExam.questions && Array.isArray(fullExam.questions) && fullExam.questions.length > 0) {
      for (const question of fullExam.questions) {
        await axiosClient.post(`/exams/${resp.data.id}/questions`, {
          question_text: question.question_text,
          question_type: question.question_type,
          points: question.points,
          sequence_order: question.sequence_order,
          correct_answer: question.correct_answer,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          option_d: question.option_d,
          explanation: question.explanation,
          input_mode: question.input_mode,
          gaps: question.gaps,
          left_items: question.left_items,
          right_items: question.right_items,
          correct_matches: question.correct_matches,
          items_to_order: question.items_to_order,
          correct_sequence: question.correct_sequence,
          diagram_image_url: question.diagram_image_url,
          label_points: question.label_points,
          requires_teacher_grading: question.requires_teacher_grading,
          allow_multiple_answers: question.allow_multiple_answers
        });
      }
      return { success: true, title: fullExam.title, count: fullExam.questions.length };
    } else {
      return { success: true, title: fullExam.title, count: 0, warning: true };
    }
  };

  const handleAssignTest = async () => {
    if (!selectedTest) {
      message.warning("Please select a test");
      return;
    }

    if (!selectedGroup) {
      message.warning("Please select a group to assign the test to");
      return;
    }

    setLoading(true);
    try {
      const result = await assignSingleTest(selectedTest.exam_id, selectedGroup);

      if (result.warning) {
        message.warning(`⚠️ Test "${result.title}" was added but has no questions.`);
      } else {
        message.success(`✅ Test "${result.title}" with ${result.count} questions added!`);
      }

      onSuccess();
      setSelectedTest(null);
      setSelectedGroup(null);
    } catch (error) {
      console.error("Error assigning test:", error);
      message.error(`❌ Failed to assign test: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSet = async (unitNumber, setNumber, setName, variants) => {
    if (!selectedGroup) {
      message.warning("Please select a group to assign the set to");
      return;
    }

    if (!variants || variants.length === 0) {
      message.warning("This set has no tests to assign");
      return;
    }

    if (!window.confirm(`Are you sure you want to assign all ${variants.length} tests in "${setName}" to the selected group?`)) {
      return;
    }

    // Backend endpoint for bulk assignment if available, else client-side loop
    // Using existing endpoint: POST /exams/assign-set
    setLoading(true);
    try {
      await axiosClient.post('/exams/assign-set', {
        group_id: selectedGroup,
        unit: unitNumber,
        set_number: setNumber
      }, {
        params: {
          group_id: selectedGroup,
          unit: unitNumber,
          set_number: setNumber
        }
      });

      message.success(`✅ All tests in "${setName}" assigned successfully!`);
      onSuccess();
      setSelectedTest(null);
    } catch (error) {
      console.error("Error in batch assignment:", error);
      // Fallback to client-side loop if backend endpoint fails or doesn't match
      // But wait, we implemented assign-set in backend!
      // Let's rely on it. Logic was:
      // @router.post("/assign-set") def assign_set_to_group(group_id, unit, set_number...)
      // It expects query params by default? No, usually body or query.
      // Let's check signature: def assign_set_to_group(group_id: int, unit: int, set_number: int...)
      // In FastAPI, simple types are query params by default.
      message.error(`Failed to assign set: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getTestTypeColor = (testType) => {
    const colors = {
      short: "blue",
      progress: "green",
      cumulative: "purple",
    };
    return colors[testType] || "default";
  };

  const getTestTypeLabel = (testType, variant) => {
    const v = variant === "Standard" ? "" : variant;
    if (testType === "short") {
      return `Short Test ${v}`;
    } else if (testType === "progress") {
      return `Progress Test ${v}`;
    } else if (testType === "cumulative") {
      return `Cumulative Test ${v}`;
    }
    return `${testType || "Test"} ${v}`;
  };

  return (
    <Modal
      title="📚 Test Library - Browse by Unit and Set"
      open={visible}
      onCancel={onCancel}
      onOk={handleAssignTest}
      okText="Assign Selected Test"
      width={900}
      confirmLoading={loading}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Group Selection */}
        <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
          <label style={{ marginRight: 8, fontWeight: 'bold' }}>Assign to Group:</label>
          <Select
            style={{ width: 300 }}
            placeholder="Select a group first..."
            value={selectedGroup}
            onChange={setSelectedGroup}
          >
            {groups.map(group => (
              <Select.Option key={group.id} value={group.id}>
                {group.name}
              </Select.Option>
            ))}
          </Select>
          {!selectedGroup && <span style={{ color: 'orange', marginLeft: 8 }}>(Required to assign)</span>}
        </div>

        {/* Hierarchical Test Display */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {hierarchy && hierarchy.length > 0 ? (
              hierarchy.map(unit => (
                <Card
                  key={unit.unit}
                  title={
                    <Space>
                      <FileTextOutlined style={{ color: '#1890ff' }} />
                      <span>Unit {unit.unit}</span>
                      <Tag color="blue">{unit.sets.length} Set{unit.sets.length > 1 ? 's' : ''}</Tag>
                    </Space>
                  }
                  style={{ marginBottom: '16px' }}
                  size="small"
                  headStyle={{ background: '#fafafa' }}
                >
                  {unit.sets.map(set => (
                    <Card
                      key={`${unit.unit}-${set.set_num}`}
                      type="inner"
                      title={
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Space>
                            <span style={{ fontWeight: 'bold' }}>SET {set.set_num}</span>
                            <Tag>{set.variants.length} Test{set.variants.length > 1 ? 's' : ''}</Tag>
                          </Space>
                          <Button
                            type="primary"
                            size="small"
                            disabled={!selectedGroup}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignSet(unit.unit, set.set_num, `SET ${set.set_num}`, set.variants);
                            }}
                          >
                            Assign Set
                          </Button>
                        </Space>
                      }
                      style={{ marginBottom: '12px' }}
                      size="small"
                    >
                      <List
                        dataSource={set.variants}
                        renderItem={(test) => (
                          <List.Item
                            style={{
                              cursor: 'pointer',
                              backgroundColor: selectedTest?.exam_id === test.exam_id ? '#e6f7ff' : 'transparent',
                              padding: '12px',
                              borderRadius: '4px',
                              border: selectedTest?.exam_id === test.exam_id ? '2px solid #1890ff' : '1px solid #f0f0f0',
                              marginBottom: '8px'
                            }}
                            onClick={() => setSelectedTest(test)}
                          >
                            <List.Item.Meta
                              avatar={
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  backgroundColor: selectedTest?.exam_id === test.exam_id ? '#1890ff' : '#f0f0f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: selectedTest?.exam_id === test.exam_id ? '#fff' : '#666'
                                }}>
                                  <FileTextOutlined style={{ fontSize: '20px' }} />
                                </div>
                              }
                              title={
                                <Space>
                                  <span style={{ fontWeight: selectedTest?.exam_id === test.exam_id ? 'bold' : 'normal' }}>
                                    {test.title}
                                  </span>
                                  <Tag color={getTestTypeColor(test.test_type)}>
                                    {getTestTypeLabel(test.test_type, test.variant)}
                                  </Tag>
                                </Space>
                              }
                              description={
                                <Space size="middle" wrap>
                                  {test.estimated_time && <span><ClockCircleOutlined /> {test.estimated_time} min</span>}
                                  <span>📝 {test.question_count} questions</span>
                                  {test.total_marks && <span>🎯 {test.total_marks} marks</span>}
                                  {test.source && <Tag color="cyan">{test.source}</Tag>}
                                </Space>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </Card>
                  ))}
                </Card>
              ))
            ) : (
              <Empty description="No tests available in the library" />
            )}
          </div>
        )}

        {selectedTest && (
          <Alert
            message={`Selected: ${selectedTest.title}`}
            type="info"
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
};

export default HierarchicalTestLibrary;
