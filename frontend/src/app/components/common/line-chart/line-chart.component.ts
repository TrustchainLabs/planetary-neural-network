import { Component, Input, OnInit, ViewChild, ElementRef, OnDestroy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';

Chart.register(...registerables);

export interface ChartDataPoint {
  [key: string]: string | number;
}

export interface ChartLegends {
  [key: string]: string;
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <div class="chart-title">{{ title }}</div>
      <div class="chart-container">
        <canvas #chartCanvas></canvas>
      </div>
    </div>
  `,
  styleUrls: ['./line-chart.component.scss']
})
export class LineChartComponent implements OnInit {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() data: ChartDataPoint[] = [];
  @Input() title: string = '';
  @Input() xKey: string = '';
  @Input() yKey: string = '';
  @Input() legends: ChartLegends = {};

  private chart!: Chart;

  ngOnInit() {
    this.createChart();
  }

  ngOnChanges() {
    if (this.chart) {
      this.updateChart();
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createChart() {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const chartData: ChartData<'line'> = {
      labels: this.data.map(item => item[this.xKey]),
      datasets: [
        {
          label: this.legends[this.yKey] || this.yKey,
          data: this.data.map(item => item[this.yKey] as number),
          borderColor: 'rgba(18, 160, 56, 1)',
          backgroundColor: 'rgba(18, 160, 56, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.2
        }
      ]
    };

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: 'rgba(217, 217, 217, 1)',
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(19, 19, 19, 0.9)',
            titleColor: 'rgba(217, 217, 217, 1)',
            bodyColor: 'rgba(217, 217, 217, 1)',
            borderColor: 'rgba(18, 160, 56, 1)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            border: {
              display: false
            },
            grid: {
              display: false
            },
            ticks: {
              color: 'rgba(217, 217, 217, 0.7)',
              font: {
                size: 12
              }
            }
          },
          y: {
            border: {
              display: false
            },
            grid: {
              color: 'rgba(58, 58, 58, 1)',
              lineWidth: 1
            },
            ticks: {
              color: 'rgba(217, 217, 217, 0.7)',
              font: {
                size: 12
              }
            }
          }
        },
        elements: {
          point: {
            radius: 3,
            hoverRadius: 6,
            backgroundColor: 'rgba(18, 160, 56, 1)',
            borderColor: 'rgba(255, 255, 255, 1)',
            borderWidth: 2
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart() {
    if (!this.chart) return;

    this.chart.data.labels = this.data.map(item => item[this.xKey]);
    this.chart.data.datasets[0].data = this.data.map(item => item[this.yKey] as number);
    this.chart.data.datasets[0].label = this.legends[this.yKey] || this.yKey;
    this.chart.update();
  }
}
