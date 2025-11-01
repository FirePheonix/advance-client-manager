'use client';

import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Button,
  List,
  Descriptions,
  Avatar,
  message,
  Modal,
  Form,
  Input,
} from "antd";

import { PlusOutlined, ExclamationOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import './billing.css';

// Import database functions
import { 
  getPaymentsByPeriod,
  getClients,
  getSettings,
  getOtherExpenses,
  createOtherExpense,
  updateOtherExpense,
  deleteOtherExpense
} from "@/lib/database";

// Import placeholder images
const mastercard = "/dashboard-assets/mastercard-logo.png";
const paypal = "/dashboard-assets/paypal-logo-2.png";
const visa = "/dashboard-assets/visa-logo.png";

export default function Billing() {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<any>(null);
  const [invoiceData, setInvoiceData] = useState<any[]>([]);
  const [clientInformation, setClientInformation] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expenseForm] = Form.useForm();

  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    try {
      setLoading(true);
      
      // Get current month dates
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${daysInMonth}`;

      // Get last 30 days for transactions
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      const transactionStartDate = last30Days.toISOString().split('T')[0];

      // Fetch all data
      const [
        currentPayments,
        clients,
        allPayments,
        settings,
        otherExpenses
      ] = await Promise.all([
        getPaymentsByPeriod(startDate, endDate),
        getClients(),
        getPaymentsByPeriod(transactionStartDate, endDate),
        getSettings(),
        getOtherExpenses()
      ]);

      // Calculate billing statistics
      const totalRevenue = currentPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const totalClients = clients.length;

      setBillingData({
        totalRevenue,
        totalClients,
        bankAccountName: settings.bank_account_name || 'Janavi Sawadia',
        bankAccountNumber: settings.bank_account_number || '50100613672509',
      });

      // Set expenses data
      setExpenses(otherExpenses || []);

      // Format invoice data (recent payments as invoices)
      const formattedInvoices = currentPayments.slice(0, 5).map((payment, index) => ({
        title: new Date(payment.payment_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        description: `#INV-${String(index + 1).padStart(6, '0')}`,
        amount: `₹${payment.amount}`,
        id: `invoice-${index + 1}`
      }));

      setInvoiceData(formattedInvoices);

      // Format client information
      const formattedClients = clients.slice(0, 3).map(client => ({
        title: client.name,
        description: client.company || client.name,
        address: client.email,
        vat: client.gst_number || 'N/A',
        id: client.id
      }));

      setClientInformation(formattedClients);

      // Format transactions (all payments in last 30 days)
      const formattedTransactions = allPayments.slice(0, 10).map((payment, index) => {
        const paymentDate = new Date(payment.payment_date);
        const isRecent = (new Date().getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24) <= 2;
        
        return {
          title: `Payment from Client`,
          description: paymentDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          amount: `+ ₹${payment.amount}`,
          textclass: "text-fill",
          amountcolor: "text-success",
          avatar: <PlusOutlined style={{ fontSize: 10 }} />,
          isRecent
        };
      });

      setTransactions(formattedTransactions);

    } catch (error) {
      console.error("Error loading billing data:", error);
      message.error("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }

  // Expense CRUD functions
  const handleAddExpense = () => {
    setEditingExpense(null);
    expenseForm.resetFields();
    expenseForm.setFieldsValue({
      date: new Date().toISOString().split('T')[0]
    });
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense);
    expenseForm.setFieldsValue({
      title: expense.title,
      amount: expense.amount,
      date: expense.date,
      description: expense.description
    });
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this expense?',
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteOtherExpense(expenseId);
          setExpenses(prev => prev.filter(expense => expense.id !== expenseId));
          message.success('Expense deleted successfully!');
        } catch (error) {
          console.error('Error deleting expense:', error);
          message.error('Failed to delete expense');
        }
      }
    });
  };

  const handleExpenseSubmit = async (values: any) => {
    try {
      const expenseData = {
        title: values.title.trim(),
        amount: parseFloat(values.amount),
        date: values.date,
        description: values.description?.trim() || null
      };

      if (editingExpense) {
        // Update existing expense
        const updatedExpense = await updateOtherExpense(editingExpense.id, expenseData);
        setExpenses(prev => 
          prev.map(expense => 
            expense.id === updatedExpense.id ? updatedExpense : expense
          )
        );
        message.success('Expense updated successfully!');
      } else {
        // Create new expense
        const newExpense = await createOtherExpense(expenseData);
        setExpenses(prev => [newExpense, ...prev]);
        message.success('Expense added successfully!');
      }

      setIsExpenseModalOpen(false);
      expenseForm.resetFields();
      setEditingExpense(null);
    } catch (error) {
      console.error('Error saving expense:', error);
      message.error('Failed to save expense');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  // SVG Icons
  const wifi = [
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="25"
      height="25"
      viewBox="0 0 22.5 20.625"
      key={0}
    >
      <g id="wifi" transform="translate(0.75 0.75)">
        <circle
          id="Oval"
          cx="1.5"
          cy="1.5"
          r="1.5"
          transform="translate(9 16.875)"
          fill="#fff"
        ></circle>
        <path
          id="Path"
          d="M0,1.36a6.377,6.377,0,0,1,7.5,0"
          transform="translate(6.75 11.86)"
          fill="none"
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="1.5"
        ></path>
        <path
          id="Path-2"
          data-name="Path"
          d="M14.138,2.216A12.381,12.381,0,0,0,0,2.216"
          transform="translate(3.431 6)"
          fill="none"
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="1.5"
        ></path>
        <path
          id="Path-3"
          data-name="Path"
          d="M0,3.294a18.384,18.384,0,0,1,21,0"
          fill="none"
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="1.5"
        ></path>
      </g>
    </svg>,
  ];

  const angle = [
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      key={0}
    >
      <g id="bank" transform="translate(0.75 0.75)">
        <path
          id="Shape"
          transform="translate(0.707 9.543)"
          fill="none"
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="1.5"
        ></path>
        <path
          id="Path"
          d="M10.25,0,20.5,9.19H0Z"
          fill="none"
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="1.5"
        ></path>
        <path
          id="Path-2"
          data-name="Path"
          d="M0,.707H20.5"
          transform="translate(0 19.793)"
          fill="none"
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="1.5"
        ></path>
      </g>
    </svg>,
  ];

  const pencil = [
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      key={0}
    >
      <path
        d="M13.5858 3.58579C14.3668 2.80474 15.6332 2.80474 16.4142 3.58579C17.1953 4.36683 17.1953 5.63316 16.4142 6.41421L15.6213 7.20711L12.7929 4.37868L13.5858 3.58579Z"
        className="fill-gray-7"
      ></path>
      <path
        d="M11.3787 5.79289L3 14.1716V17H5.82842L14.2071 8.62132L11.3787 5.79289Z"
        className="fill-gray-7"
      ></path>
    </svg>,
  ];

  const download = [
    <svg
      width="15"
      height="15"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      key="0"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 17C3 16.4477 3.44772 16 4 16H16C16.5523 16 17 16.4477 17 17C17 17.5523 16.5523 18 16 18H4C3.44772 18 3 17.5523 3 17ZM6.29289 9.29289C6.68342 8.90237 7.31658 8.90237 7.70711 9.29289L9 10.5858L9 3C9 2.44772 9.44771 2 10 2C10.5523 2 11 2.44771 11 3L11 10.5858L12.2929 9.29289C12.6834 8.90237 13.3166 8.90237 13.7071 9.29289C14.0976 9.68342 14.0976 10.3166 13.7071 10.7071L10.7071 13.7071C10.5196 13.8946 10.2652 14 10 14C9.73478 14 9.48043 13.8946 9.29289 13.7071L6.29289 10.7071C5.90237 10.3166 5.90237 9.68342 6.29289 9.29289Z"
        fill="#111827"
      ></path>
    </svg>,
  ];

  const deletebtn = [
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      key={0}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 2C8.62123 2 8.27497 2.214 8.10557 2.55279L7.38197 4H4C3.44772 4 3 4.44772 3 5C3 5.55228 3.44772 6 4 6L4 16C4 17.1046 4.89543 18 6 18H14C15.1046 18 16 17.1046 16 16V6C16.5523 6 17 5.55228 17 5C17 4.44772 16.5523 4 16 4H12.618L11.8944 2.55279C11.725 2.214 11.3788 2 11 2H9ZM7 8C7 7.44772 7.44772 7 8 7C8.55228 7 9 7.44772 9 8V14C9 14.5523 8.55228 15 8 15C7.44772 15 7 14.5523 7 14V8ZM12 7C11.4477 7 11 7.44772 11 8V14C11 14.5523 11.4477 15 12 15C12.5523 15 13 14.5523 13 14V8C13 7.44772 12.5523 7 12 7Z"
        fill="#111827"
        className="fill-danger"
      ></path>
    </svg>,
  ];

  const calender = [
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      key={0}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 2C5.44772 2 5 2.44772 5 3V4H4C2.89543 4 2 4.89543 2 6V16C2 17.1046 2.89543 18 4 18H16C17.1046 18 18 17.1046 18 16V6C18 4.89543 17.1046 4 16 4H15V3C15 2.44772 14.5523 2 14 2C13.4477 2 13 2.44772 13 3V4H7V3C7 2.44772 6.55228 2 6 2ZM6 7C5.44772 7 5 7.44772 5 8C5 8.55228 5.44772 9 6 9H14C14.5523 9 15 8.55228 15 8C15 7.44772 14.5523 7 14 7H6Z"
        fill="#111827"
        className="fill-muted"
      ></path>
    </svg>,
  ];

  const mins = [
    <svg
      width="10"
      height="10"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      key={0}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 10C5 9.44772 5.44772 9 6 9L14 9C14.5523 9 15 9.44772 15 10C15 10.5523 14.5523 11 14 11L6 11C5.44772 11 5 10.5523 5 10Z"
        className="fill-danger"
      ></path>
    </svg>,
  ];

  // Split transactions into newest and yesterday
  const newestTransactions = transactions.filter(t => t.isRecent).slice(0, 2);
  const yesterdayTransactions = transactions.filter(t => !t.isRecent).slice(0, 4);

  return (
    <div className="layout-content">
      <Row gutter={[24, 0]}>
        <Col xs={24} md={16}>
          <Row gutter={[24, 0]}>
            <Col xs={24} xl={12} className="mb-24">
              <Card
                title={wifi}
                variant="borderless"
                className="card-credit header-solid h-full"
              >
                <h5 className="card-number">
                  {loading ? "Loading..." : billingData?.bankAccountNumber ? 
                    `**** **** **** ${billingData.bankAccountNumber.slice(-4)}` : 
                    "**** **** **** 2509"
                  }
                </h5>

                <div className="card-footer">
                  <div className="mr-30">
                    <p>Account Holder</p>
                    <h6>{loading ? "Loading..." : billingData?.bankAccountName || "Janavi Sawadia"}</h6>
                  </div>
                  <div className="mr-30">
                    <p>Type</p>
                    <h6>Business</h6>
                  </div>
                  <div className="card-footer-col col-logo ml-auto">
                    <img src={mastercard} alt="Bank" />
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={12} xl={6} className="mb-24">
              <Card variant="borderless" className="widget-2 h-full">
                <Statistic
                  title={
                    <>
                      <div className="icon">{angle}</div>
                      <h6>Monthly Revenue</h6>
                      <p>Current Month</p>
                    </>
                  }
                  value={loading ? "Loading..." : formatCurrency(billingData?.totalRevenue || 0)}
                  prefix={!loading && <PlusOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} xl={6} className="mb-24">
              <Card variant="borderless" className="widget-2 h-full">
                <Statistic
                  title={
                    <>
                      <div className="icon">
                        <img src={paypal} alt="clients" />
                      </div>
                      <h6>Total Clients</h6>
                      <p>Active Clients</p>
                    </>
                  }
                  value={loading ? "Loading..." : billingData?.totalClients || 0}
                  prefix={!loading && <PlusOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} className="mb-24">
              <Card
                className="header-solid h-full ant-card-p-0"
                title={
                  <>
                    <Row
                      gutter={[24, 0]}
                      className="ant-row-flex ant-row-flex-middle"
                    >
                      <Col xs={24} md={12}>
                        <h6 className="font-semibold m-0">Payment Methods</h6>
                      </Col>
                      <Col xs={24} md={12} className="d-flex">
                        <Button type="primary">ADD NEW CARD</Button>
                      </Col>
                    </Row>
                  </>
                }
              >
                <Row gutter={[24, 0]}>
                  <Col span={24} md={12}>
                    <Card className="payment-method-card">
                      <img src={mastercard} alt="mastercard" />
                      <h6 className="card-number">**** **** **** 7362</h6>
                      <Button type="link" className="ant-edit-link">
                        {pencil}
                      </Button>
                    </Card>
                  </Col>
                  <Col span={24} md={12}>
                    <Card className="payment-method-card">
                      <img src={visa} alt="visa" />
                      <h6 className="card-number">**** **** **** 3288</h6>
                      <Button type="link" className="ant-edit-link">
                        {pencil}
                      </Button>
                    </Card>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </Col>
        <Col span={24} md={8} className="mb-24">
          <Card
            variant="borderless"
            className="header-solid h-full ant-invoice-card"
            title={[<h6 className="font-semibold m-0">Recent Invoices</h6>]}
            extra={[
              <Button type="primary" key="view-all">
                <span>VIEW ALL</span>
              </Button>,
            ]}
          >
            {loading ? (
              <div className="text-center py-4">Loading invoices...</div>
            ) : (
              <List
                itemLayout="horizontal"
                className="invoice-list"
                dataSource={invoiceData}
                renderItem={(item) => (
                  <List.Item
                    actions={[<Button type="link" key="download">{download} PDF</Button>]}
                  >
                    <List.Item.Meta
                      title={item.title}
                      description={item.description}
                    />
                    <div className="amount">{item.amount}</div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
      <Row gutter={[24, 0]}>
        <Col span={24} md={16} className="mb-24">
          <Card
            className="header-solid h-full"
            variant="borderless"
            title={[<h6 className="font-semibold m-0">Client Information</h6>]}
            bodyStyle={{ paddingTop: "0" }}
          >
            <Row gutter={[24, 24]}>
              {loading ? (
                <Col span={24}>
                  <div className="text-center py-4">Loading client information...</div>
                </Col>
              ) : (
                clientInformation.map((client, index) => (
                  <Col span={24} key={index}>
                    <Card className="card-billing-info" variant="borderless">
                      <div className="col-info">
                        <Descriptions title={client.title}>
                          <Descriptions.Item label="Company Name" span={3}>
                            {client.description}
                          </Descriptions.Item>
                          <Descriptions.Item label="Email Address" span={3}>
                            {client.address}
                          </Descriptions.Item>
                          <Descriptions.Item label="GST Number" span={3}>
                            {client.vat}
                          </Descriptions.Item>
                        </Descriptions>
                      </div>
                      <div className="col-action">
                        <Button type="link" danger>
                          {deletebtn}DELETE
                        </Button>
                        <Button type="link" className="darkbtn">
                          {pencil} EDIT
                        </Button>
                      </div>
                    </Card>
                  </Col>
                ))
              )}
            </Row>
          </Card>
        </Col>
        <Col span={24} md={8} className="mb-24">
          <Card
            variant="borderless"
            bodyStyle={{ paddingTop: 0 }}
            className="header-solid expenses-card"
            title={<h6 className="font-semibold m-0">Your Expenses</h6>}
            extra={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p className="card-header-date" style={{ margin: 0 }}>
                  {calender}
                  <span>Last 30 Days</span>
                </p>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<PlusOutlined />}
                  onClick={handleAddExpense}
                >
                  Add
                </Button>
              </div>
            }
          >
            {loading ? (
              <div className="text-center py-4">Loading expenses...</div>
            ) : (
              <>
                {expenses.length > 0 ? (
                  <>
                    <div className="expenses-scroll-container">
                      <List
                        className="transactions-list"
                        itemLayout="horizontal"
                        dataSource={expenses} // Show all expenses with scroll
                        renderItem={(expense) => (
                          <List.Item
                            actions={[
                              <Button 
                                key="edit"
                                type="link" 
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleEditExpense(expense)}
                              />,
                              <Button 
                                key="delete"
                                type="link" 
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteExpense(expense.id)}
                              />
                            ]}
                          >
                            <List.Item.Meta
                              avatar={
                                <Avatar size="small" className="text-fill">
                                  {mins}
                                </Avatar>
                              }
                              title={expense.title}
                              description={new Date(expense.date).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            />
                            <div className="amount">
                              <span className="fill-danger">- ₹{expense.amount}</span>
                            </div>
                          </List.Item>
                        )}
                      />
                    </div>

                    {expenses.length > 0 && (
                      <div className="expenses-footer">
                        <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: '12px' }}>
                          Total: {expenses.length} expense{expenses.length !== 1 ? 's' : ''} | 
                          Sum: ₹{expenses.reduce((sum, exp) => sum + Number(exp.amount), 0).toFixed(2)}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="expenses-list-empty">
                    <div>
                      <p>No expenses found.</p>
                      <p>Click "Add" to create your first expense.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Expense Modal */}
      <Modal
        title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
        open={isExpenseModalOpen}
        onCancel={() => {
          setIsExpenseModalOpen(false);
          expenseForm.resetFields();
          setEditingExpense(null);
        }}
        footer={null}
        width={500}
      >
        <Form
          form={expenseForm}
          layout="vertical"
          onFinish={handleExpenseSubmit}
          initialValues={{
            date: new Date().toISOString().split('T')[0]
          }}
        >
          <Form.Item
            name="title"
            label="Expense Title"
            rules={[
              { required: true, message: 'Please enter expense title' },
              { min: 3, message: 'Title must be at least 3 characters' }
            ]}
          >
            <Input placeholder="e.g., Office supplies, Software subscription" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount (₹)"
            rules={[
              { required: true, message: 'Please enter amount' },
              { 
                validator: (_, value) => {
                  if (!value || isNaN(value) || parseFloat(value) <= 0) {
                    return Promise.reject(new Error('Amount must be greater than 0'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              prefix="₹"
            />
          </Form.Item>

          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select date' }]}
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <Input.TextArea
              rows={3}
              placeholder="Optional description or notes..."
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button 
                onClick={() => {
                  setIsExpenseModalOpen(false);
                  expenseForm.resetFields();
                  setEditingExpense(null);
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingExpense ? 'Update Expense' : 'Add Expense'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}