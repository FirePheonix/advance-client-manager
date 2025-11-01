'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { Typography } from "antd";
import { MinusOutlined } from "@ant-design/icons";
import { lineChart } from "./configs/lineChart";
import { getPaymentsByPeriod, getOtherExpensesByPeriod, getTeamSalariesByPeriod } from "@/lib/database";

// Dynamically import ReactApexChart to avoid SSR issues
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

function LineChart() {
  const { Title, Paragraph } = Typography;
  const [chartData, setChartData] = useState(lineChart);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, []);

  async function loadChartData() {
    try {
      setLoading(true);
      
      // Get last 9 months of data
      const months = [];
      const currentDate = new Date();
      
      for (let i = 8; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const daysInMonth = new Date(year, month, 0).getDate();
        
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth}`;
        
        months.push({
          name: date.toLocaleDateString('en', { month: 'short' }),
          startDate,
          endDate
        });
      }

      // Fetch data for each month
      const monthlyData = await Promise.all(
        months.map(async (month) => {
          const [revenue, expenses] = await Promise.all([
            getPaymentsByPeriod(month.startDate, month.endDate),
            Promise.all([
              getOtherExpensesByPeriod(month.startDate, month.endDate),
              getTeamSalariesByPeriod(month.startDate, month.endDate)
            ])
          ]);
          
          const totalRevenue = revenue.reduce((sum, payment) => sum + Number(payment.amount), 0);
          const totalExpenses = expenses[0].reduce((sum, expense) => sum + Number(expense.amount), 0) +
                               expenses[1].reduce((sum, salary) => sum + Number(salary.amount), 0);
          
          return {
            revenue: Math.round(totalRevenue / 1000), // Convert to thousands for better display
            expenses: Math.round(totalExpenses / 1000)
          };
        })
      );

      // Update chart with real data
      const updatedChart = {
        ...lineChart,
        series: [
          {
            name: "Revenue",
            data: monthlyData.map(d => d.revenue),
            offsetY: 0,
          },
          {
            name: "Expenses",
            data: monthlyData.map(d => d.expenses),
            offsetY: 0,
          },
        ],
        options: {
          ...lineChart.options,
          xaxis: {
            ...lineChart.options.xaxis,
            categories: months.map(m => m.name)
          },
          tooltip: {
            y: {
              formatter: function (val: number) {
                return "₹" + (val * 1000).toLocaleString();
              },
            },
          }
        }
      };

      setChartData(updatedChart);
    } catch (error) {
      console.error("Error loading line chart data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center p-8">
        <div className="text-white">Loading chart data...</div>
      </div>
    );
  }

  return (
    <>
      <div className="linechart">
        <div>
          <Title level={5}>Revenue vs Expenses</Title>
          <Paragraph className="lastweek">
            last 9 months <span className="bnb2">trend</span>
          </Paragraph>
        </div>
        <div className="sales">
          <ul>
            <li>{<MinusOutlined />} Revenue</li>
            <li>{<MinusOutlined />} Expenses</li>
          </ul>
        </div>
      </div>

      <ReactApexChart
        className="full-width"
        options={chartData.options}
        series={chartData.series}
        type="area"
        height={350}
        width={"100%"}
      />
    </>
  );
}

export default LineChart;