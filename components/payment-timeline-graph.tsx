import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Area
} from 'recharts';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Plus, DollarSign, FileText } from "lucide-react";

interface PaymentTimelineData {
  date: string;
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

interface PaymentEvent {
  id: string;
  payment_date: string;
  amount: number;
  status: string;
  type: string;
  description?: string;
  post_count?: number;
  platform?: string;
}

interface PaymentTimelineGraphProps {
  client: {
    id: string;
    name: string;
  };
  events: PaymentEvent[];
  onAddPayment: (payment: { date: string; amount: number; description: string }) => void;
  onAddPost: (post: { date: string; platform: string; count: number; amount?: number }) => void;
}

export function PaymentTimelineGraph({ client, events, onAddPayment, onAddPost }: PaymentTimelineGraphProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dialogType, setDialogType] = useState<'payment' | 'post'>('payment');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    platform: 'instagram',
    count: 1
  });

  const processPaymentData = (payments: PaymentEvent[], range: 'week' | 'month' | 'year'): PaymentTimelineData[] => {
    const groupedData: Record<string, PaymentTimelineData> = {};

    payments.forEach(payment => {
      let dateKey: string;
      const paymentDate = new Date(payment.payment_date);
      
      if (range === 'week') {
        dateKey = paymentDate.toISOString().split('T')[0];
      } else if (range === 'month') {
        const weekNum = Math.floor(paymentDate.getDate() / 7);
        dateKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth() + 1}-W${weekNum}`;
      } else {
        dateKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth() + 1}`;
      }

      if (!groupedData[dateKey]) {
        groupedData[dateKey] = {
          date: dateKey,
          total: 0,
          completed: 0,
          pending: 0,
          overdue: 0
        };
      }

      groupedData[dateKey].total += Number(payment.amount);
      
      if (payment.status === 'completed') {
        groupedData[dateKey].completed += Number(payment.amount);
      } else if (payment.status === 'pending') {
        groupedData[dateKey].pending += Number(payment.amount);
      } else if (payment.status === 'overdue') {
        groupedData[dateKey].overdue += Number(payment.amount);
      }
    });

    return Object.values(groupedData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const data = processPaymentData(events, timeRange);

  const formatXAxis = (date: string) => {
    if (timeRange === 'week') {
      return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } else if (timeRange === 'month') {
      const parts = date.split('-W');
      return `Week ${parts[1]} (${new Date(parts[0]).toLocaleDateString('en-US', { month: 'short' })})`;
    } else {
      const [year, month] = date.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  };

  const handleSubmit = () => {
    if (dialogType === 'payment') {
      onAddPayment({
        date: formData.date,
        amount: formData.amount,
        description: formData.description || `Payment from ${client.name}`
      });
    } else {
      onAddPost({
        date: formData.date,
        platform: formData.platform,
        count: formData.count,
        amount: formData.amount
      });
    }
    setShowAddDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: '',
      platform: 'instagram',
      count: 1
    });
  };

  const openDialog = (type: 'payment' | 'post') => {
    setDialogType(type);
    setShowAddDialog(true);
  };

  // Dark mode colors
  const textColor = '#E5E7EB';
  const gridColor = '#374151';
  const tooltipBg = '#1F2937';
  const cardBg = '#111827';
  const buttonBg = '#1E40AF';
  const buttonHover = '#1E3A8A';

  return (
    <div className="bg-black rounded-lg shadow p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">Payment Timeline</h2>
        <div className="flex space-x-2">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDialog('payment')}
              className="flex items-center bg-gray-900 text-white hover:bg-gray-800 border-gray-700"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDialog('post')}
              className="flex items-center bg-gray-900 text-white hover:bg-gray-800 border-gray-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              Add Post
            </Button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1 text-sm rounded ${
                timeRange === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 text-sm rounded ${
                timeRange === 'month' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={`px-3 py-1 text-sm rounded ${
                timeRange === 'year' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Year
            </button>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxis}
              tick={{ fill: textColor, fontSize: 12 }}
              stroke={textColor}
            />
            <YAxis 
              tickFormatter={(value) => `₹${value}`}
              tick={{ fill: textColor, fontSize: 12 }}
              stroke={textColor}
            />
            <Tooltip 
              formatter={(value) => [`₹${value}`, '']}
              labelFormatter={(label) => `Date: ${formatXAxis(label)}`}
              contentStyle={{
                backgroundColor: tooltipBg,
                borderColor: gridColor,
                color: textColor
              }}
            />
            <Legend 
              wrapperStyle={{
                color: textColor,
                paddingTop: '20px'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              fill="#7C3AED" 
              stroke="#7C3AED" 
              name="Total Payments" 
            />
            <Bar 
              dataKey="completed" 
              fill="#10B981" 
              name="Completed" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="pending" 
              fill="#F59E0B" 
              name="Pending" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="overdue" 
              fill="#EF4444" 
              name="Overdue" 
              radius={[4, 4, 0, 0]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
          <h3 className="text-sm font-medium text-blue-400">Total Revenue</h3>
          <p className="text-2xl font-bold text-white">
            ₹{data.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
          <h3 className="text-sm font-medium text-green-400">Completed</h3>
          <p className="text-2xl font-bold text-white">
            ₹{data.reduce((sum, item) => sum + item.completed, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
          <h3 className="text-sm font-medium text-yellow-400">Pending + Overdue</h3>
          <p className="text-2xl font-bold text-white">
            ₹{(data.reduce((sum, item) => sum + item.pending, 0) + data.reduce((sum, item) => sum + item.overdue, 0)).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Add Payment/Post Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {dialogType === 'payment' ? 'Add New Payment' : 'Add Post Activity'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right text-gray-300">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="col-span-3 bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {dialogType === 'payment' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right text-gray-300">
                    Amount (₹)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                    className="col-span-3 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right text-gray-300">
                    Description
                  </Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="col-span-3 bg-gray-800 border-gray-700 text-white"
                    placeholder="Payment description"
                  />
                </div>
              </>
            )}

            {dialogType === 'post' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="platform" className="text-right text-gray-300">
                    Platform
                  </Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value) => setFormData({...formData, platform: value})}
                  >
                    <SelectTrigger className="col-span-3 bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-800 text-white">
                      <SelectItem value="instagram" className="hover:bg-gray-800">Instagram</SelectItem>
                      <SelectItem value="facebook" className="hover:bg-gray-800">Facebook</SelectItem>
                      <SelectItem value="twitter" className="hover:bg-gray-800">Twitter</SelectItem>
                      <SelectItem value="linkedin" className="hover:bg-gray-800">LinkedIn</SelectItem>
                      <SelectItem value="youtube" className="hover:bg-gray-800">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="count" className="text-right text-gray-300">
                    Post Count
                  </Label>
                  <Input
                    id="count"
                    type="number"
                    value={formData.count}
                    onChange={(e) => setFormData({...formData, count: Number(e.target.value)})}
                    className="col-span-3 bg-gray-800 border-gray-700 text-white"
                    min="1"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="post-amount" className="text-right text-gray-300">
                    Amount (₹)
                  </Label>
                  <Input
                    id="post-amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                    className="col-span-3 bg-gray-800 border-gray-700 text-white"
                    placeholder="Optional"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {dialogType === 'payment' ? 'Add Payment' : 'Add Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}