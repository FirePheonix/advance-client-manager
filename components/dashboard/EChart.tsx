'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { Row, Col, Typography } from "antd";
import { eChart } from "./configs/eChart";
import { getPaymentsByPeriod, getUpcomingPaymentsPending } from "@/lib/database";

// Dynamically import ReactApexChart to avoid SSR issues
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

function EChart() {
  const { Title, Paragraph } = Typography;
  const [chartData, setChartData] = useState(eChart);
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

      // Fetch payment data for each month
      const monthlyData = await Promise.all(
        months.map(async (month) => {
          const payments = await getPaymentsByPeriod(month.startDate, month.endDate);
          return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        })
      );

      // Update chart with real data
      const updatedChart = {
        ...eChart,
        series: [
          {
            ...eChart.series[0],
            data: monthlyData
          }
        ],
        options: {
          ...eChart.options,
          xaxis: {
            ...eChart.options.xaxis,
            categories: months.map(m => m.name)
          }
        }
      };

      setChartData(updatedChart);
    } catch (error) {
      console.error("Error loading chart data:", error);
    } finally {
      setLoading(false);
    }
  }

  const items = [
    {
      Title: "3,6K",
      user: "Users",
    },
    {
      Title: "2m",
      user: "Clicks",
    },
    {
      Title: "$772",
      user: "Sales",
    },
    {
      Title: "82",
      user: "Items",
    },
  ];

  if (loading) {
    return (
      <div className="text-center p-8">
        <div className="text-white">Loading chart data...</div>
      </div>
    );
  }

  return (
    <>
      <div id="chart">
        <ReactApexChart
          className="bar-chart"
          options={chartData.options}
          series={chartData.series}
          type="bar"
          height={220}
        />
      </div>
      <div className="chart-vistior">
        <Title level={5}>Monthly Revenue</Title>
        <Paragraph className="lastweek">
          last 9 months <span className="bnb2">trend</span>
        </Paragraph>
        <Paragraph className="lastweek">
          Revenue data from client payments over the past 9 months.
        </Paragraph>
        <Row gutter={[0, 0]}>
          {items.map((v, index) => (
            <Col xs={6} xl={6} sm={6} md={6} key={index}>
              <div className="chart-visitor-count">
                <Title level={4}>{v.Title}</Title>
                <span>{v.user}</span>
              </div>
            </Col>
          ))}
        </Row>
      </div>
    </>
  );
}

export default EChart;