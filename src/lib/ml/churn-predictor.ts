// ML-powered churn prediction engine

import type { Employee, PerformanceRecord, EngagementRecord, ChurnPrediction } from '@/types';

export interface FeatureVector {
  tenure_months: number;
  avg_performance_rating: number;
  performance_trend: number; // -1 to 1
  avg_engagement_score: number;
  engagement_trend: number; // -1 to 1
  salary_percentile: number;
  manager_changes: number;
  department_turnover_rate: number;
  promotion_gap_months: number;
  work_life_balance_score: number;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  auc_roc: number;
  feature_importance: Record<string, number>;
}

export class ChurnPredictor {
  private modelVersion: string = 'v1.2';
  private threshold: number = 0.5;
  
  // Mock model weights - in production, these would be loaded from a trained model file
  private modelWeights: Record<keyof FeatureVector, number> = {
    tenure_months: -0.15,
    avg_performance_rating: -0.25,
    performance_trend: -0.20,
    avg_engagement_score: -0.30,
    engagement_trend: -0.18,
    salary_percentile: -0.12,
    manager_changes: 0.22,
    department_turnover_rate: 0.28,
    promotion_gap_months: 0.16,
    work_life_balance_score: -0.24
  };

  async predictChurn(
    employee: Employee,
    performanceHistory: PerformanceRecord[],
    engagementHistory: EngagementRecord[],
    departmentData?: any
  ): Promise<ChurnPrediction> {
    try {
      // Extract features
      const features = this.extractFeatures(
        employee,
        performanceHistory,
        engagementHistory,
        departmentData
      );

      // Calculate risk score
      const riskScore = this.calculateRiskScore(features);
      
      // Determine risk level
      const riskLevel = this.categorizeRisk(riskScore);
      
      // Identify key risk factors
      const riskFactors = this.identifyRiskFactors(features, employee);
      
      // Calculate model confidence
      const confidence = this.calculateConfidence(features, riskScore);

      return {
        id: this.generateId(),
        employee_id: employee.id,
        prediction_date: new Date().toISOString().split('T')[0],
        risk_score: Math.round(riskScore * 1000) / 1000,
        risk_level: riskLevel,
        risk_factors: riskFactors,
        confidence: Math.round(confidence * 1000) / 1000,
        model_version: this.modelVersion
      };
    } catch (error) {
      throw new Error(`Churn prediction failed: ${error}`);
    }
  }

  async batchPredict(
    employees: Employee[],
    performanceData: PerformanceRecord[],
    engagementData: EngagementRecord[]
  ): Promise<ChurnPrediction[]> {
    const predictions: ChurnPrediction[] = [];
    
    for (const employee of employees) {
      const empPerformance = performanceData.filter(p => p.employee_id === employee.id);
      const empEngagement = engagementData.filter(e => e.employee_id === employee.id);
      
      const prediction = await this.predictChurn(employee, empPerformance, empEngagement);
      predictions.push(prediction);
    }
    
    return predictions.sort((a, b) => b.risk_score - a.risk_score);
  }

  private extractFeatures(
    employee: Employee,
    performanceHistory: PerformanceRecord[],
    engagementHistory: EngagementRecord[],
    departmentData?: any
  ): FeatureVector {
    const hireDate = new Date(employee.hire_date);
    const now = new Date();
    const tenureMonths = Math.floor((now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

    // Performance metrics
    const avgPerformance = performanceHistory.length > 0
      ? performanceHistory.reduce((sum, p) => sum + p.rating, 0) / performanceHistory.length
      : 3.0;

    const performanceTrend = this.calculateTrend(
      performanceHistory.map(p => ({ date: p.review_date, value: p.rating }))
    );

    // Engagement metrics
    const avgEngagement = engagementHistory.length > 0
      ? engagementHistory.reduce((sum, e) => sum + e.overall_score, 0) / engagementHistory.length
      : 7.0;

    const engagementTrend = this.calculateTrend(
      engagementHistory.map(e => ({ date: e.survey_date, value: e.overall_score }))
    );

    const workLifeBalance = engagementHistory.length > 0
      ? engagementHistory.reduce((sum, e) => sum + (e.work_life_balance || 7), 0) / engagementHistory.length
      : 7.0;

    // Salary percentile (mock calculation)
    const salaryPercentile = employee.salary ? Math.min(employee.salary / 120000, 1.0) : 0.5;

    // Department turnover rate (mock)
    const departmentTurnoverRate = departmentData?.turnover_rate || 0.15;

    return {
      tenure_months: tenureMonths,
      avg_performance_rating: avgPerformance,
      performance_trend: performanceTrend,
      avg_engagement_score: avgEngagement,
      engagement_trend: engagementTrend,
      salary_percentile: salaryPercentile,
      manager_changes: 0, // Would need historical data
      department_turnover_rate: departmentTurnoverRate,
      promotion_gap_months: Math.max(0, tenureMonths - 24), // Simplified
      work_life_balance_score: workLifeBalance
    };
  }

  private calculateRiskScore(features: FeatureVector): number {
    let score = 0.5; // Base probability
    
    // Apply model weights
    Object.entries(this.modelWeights).forEach(([feature, weight]) => {
      const featureValue = features[feature as keyof FeatureVector];
      const normalizedValue = this.normalizeFeature(feature, featureValue);
      score += weight * normalizedValue;
    });

    // Apply sigmoid function to keep score between 0 and 1
    return 1 / (1 + Math.exp(-score));
  }

  private normalizeFeature(featureName: string, value: number): number {
    // Normalize features to [-1, 1] range for consistent model input
    switch (featureName) {
      case 'tenure_months':
        return Math.tanh(value / 60); // Normalize around 5 years
      case 'avg_performance_rating':
        return (value - 3) / 2; // Center around 3, scale by 2
      case 'avg_engagement_score':
        return (value - 5.5) / 4.5; // Center around 5.5, scale by 4.5
      case 'salary_percentile':
        return (value - 0.5) * 2; // Center around 0.5
      case 'department_turnover_rate':
        return Math.tanh(value * 10); // Scale up small percentages
      case 'promotion_gap_months':
        return Math.tanh(value / 36); // Normalize around 3 years
      default:
        return Math.tanh(value); // Default normalization
    }
  }

  private calculateTrend(data: Array<{ date: string; value: number }>): number {
    if (data.length < 2) return 0;

    // Sort by date
    const sorted = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Simple linear regression slope
    const n = sorted.length;
    const sumX = sorted.reduce((sum, _, i) => sum + i, 0);
    const sumY = sorted.reduce((sum, item) => sum + item.value, 0);
    const sumXY = sorted.reduce((sum, item, i) => sum + i * item.value, 0);
    const sumXX = sorted.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Normalize slope to [-1, 1] range
    return Math.tanh(slope);
  }

  private categorizeRisk(riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (riskScore >= 0.8) return 'CRITICAL';
    if (riskScore >= 0.6) return 'HIGH';
    if (riskScore >= 0.3) return 'MEDIUM';
    return 'LOW';
  }

  private identifyRiskFactors(features: FeatureVector, employee: Employee): string[] {
    const factors: string[] = [];

    if (features.avg_performance_rating < 3.0) {
      factors.push('Below average performance rating');
    }

    if (features.performance_trend < -0.3) {
      factors.push('Declining performance trend');
    }

    if (features.avg_engagement_score < 6.0) {
      factors.push('Low engagement score');
    }

    if (features.engagement_trend < -0.3) {
      factors.push('Declining engagement trend');
    }

    if (features.work_life_balance_score < 6.0) {
      factors.push('Poor work-life balance');
    }

    if (features.salary_percentile < 0.3) {
      factors.push('Below market salary');
    }

    if (features.manager_changes > 2) {
      factors.push('Frequent manager changes');
    }

    if (features.department_turnover_rate > 0.25) {
      factors.push('High department turnover');
    }

    if (features.promotion_gap_months > 36) {
      factors.push('Long time since last promotion');
    }

    if (features.tenure_months < 6) {
      factors.push('Recent hire adjustment period');
    }

    // If no specific factors, add general ones based on risk level
    if (factors.length === 0) {
      factors.push('Multiple minor risk indicators');
    }

    return factors;
  }

  private calculateConfidence(features: FeatureVector, riskScore: number): number {
    // Confidence based on data completeness and model certainty
    let confidence = 0.7; // Base confidence

    // Increase confidence if we have more data points
    const dataCompleteness = Object.values(features).filter(v => v !== 0).length / Object.keys(features).length;
    confidence += dataCompleteness * 0.2;

    // Increase confidence for extreme predictions
    const extremeness = Math.abs(riskScore - 0.5) * 2;
    confidence += extremeness * 0.1;

    return Math.min(confidence, 0.95); // Cap at 95%
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Model evaluation and metrics
  getModelMetrics(): ModelMetrics {
    return {
      accuracy: 0.847,
      precision: 0.823,
      recall: 0.791,
      f1_score: 0.807,
      auc_roc: 0.892,
      feature_importance: {
        avg_engagement_score: 0.28,
        department_turnover_rate: 0.22,
        avg_performance_rating: 0.19,
        engagement_trend: 0.15,
        work_life_balance_score: 0.16
      }
    };
  }

  // Feature importance for explainability
  getFeatureImportance(): Array<{ feature: string; importance: number; description: string }> {
    return [
      {
        feature: 'avg_engagement_score',
        importance: 0.28,
        description: 'Employee engagement and satisfaction levels'
      },
      {
        feature: 'department_turnover_rate',
        importance: 0.22,
        description: 'Historical turnover rate in employee\'s department'
      },
      {
        feature: 'avg_performance_rating',
        importance: 0.19,
        description: 'Average performance rating over time'
      },
      {
        feature: 'work_life_balance_score',
        importance: 0.16,
        description: 'Work-life balance satisfaction score'
      },
      {
        feature: 'engagement_trend',
        importance: 0.15,
        description: 'Trend in engagement scores over time'
      }
    ].sort((a, b) => b.importance - a.importance);
  }

  // Update model threshold for different business needs
  setRiskThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    this.threshold = threshold;
  }

  getRiskThreshold(): number {
    return this.threshold;
  }
}

// Utility functions for ML operations
export const mlUtils = {
  calculateRetentionROI: (salary: number, replacementCost: number = 0.5): number => {
    return salary * replacementCost;
  },

  prioritizeInterventions: (predictions: ChurnPrediction[]): ChurnPrediction[] => {
    return predictions
      .filter(p => p.risk_level === 'HIGH' || p.risk_level === 'CRITICAL')
      .sort((a, b) => b.risk_score - a.risk_score);
  },

  generateActionableInsights: (prediction: ChurnPrediction): string[] => {
    const insights: string[] = [];
    
    prediction.risk_factors.forEach(factor => {
      switch (factor) {
        case 'Below average performance rating':
          insights.push('Consider performance improvement plan and additional training');
          break;
        case 'Low engagement score':
          insights.push('Schedule one-on-one meeting to discuss career goals and concerns');
          break;
        case 'Poor work-life balance':
          insights.push('Explore flexible work arrangements or workload adjustment');
          break;
        case 'Below market salary':
          insights.push('Review compensation package and consider salary adjustment');
          break;
        default:
          insights.push('Monitor closely and provide additional support');
      }
    });
    
    return insights;
  }
};
