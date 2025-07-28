// LLM-powered natural language query engine

import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type { NaturalLanguageQuery, Employee, ChurnPrediction } from '@/types';

export class QueryEngine {
  private llm?: ChatOpenAI;
  private sqlPrompt: PromptTemplate;
  private explanationPrompt: PromptTemplate;

  constructor(apiKey: string) {
    // For demo purposes, we'll use mock implementations
    // In production, uncomment the lines below and use real OpenAI API
    
    /*
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-4',
      temperature: 0.1,
    });
    */

    this.sqlPrompt = PromptTemplate.fromTemplate(`
You are an expert SQL analyst for an HR analytics platform. Convert the following natural language query into a SQL query.

Database Schema:
- employees: id, name, email, department, manager_id, hire_date, exit_date, role, location, salary
- performance_records: id, employee_id, review_date, rating, comments, goals_met, reviewer_id
- engagement_records: id, employee_id, survey_date, overall_score, work_life_balance, career_development, compensation_satisfaction, manager_relationship
- churn_predictions: id, employee_id, prediction_date, risk_score, risk_level, risk_factors, confidence, model_version

Rules:
1. Only use tables and columns that exist in the schema
2. Use proper JOIN statements when needed
3. Include appropriate WHERE clauses for filtering
4. Use aggregate functions when asking for counts, averages, etc.
5. Always include LIMIT clause for large result sets
6. Use proper date formatting and comparisons

Natural Language Query: {query}

SQL Query:
`);

    this.explanationPrompt = PromptTemplate.fromTemplate(`
You are an HR analytics expert. Explain the following SQL query results in simple, business-friendly language.

Original Question: {query}
SQL Query: {sql}
Results: {results}

Provide a clear, concise explanation that:
1. Summarizes what the data shows
2. Highlights key insights
3. Suggests potential actions if relevant
4. Uses business terminology, not technical jargon

Explanation:
`);
  }

  async processQuery(query: string, userId: string): Promise<NaturalLanguageQuery> {
    try {
      // For demo purposes, use mock SQL generation
      // In production, use the real LLM implementation above
      const sql = this.generateMockSQL(query);
      
      // Execute SQL query (mock implementation for now)
      const results = await this.executeSQLQuery(sql);
      
      // Generate mock explanation
      const explanation = this.generateMockExplanation(query, results);

      return {
        id: this.generateId(),
        query,
        sql_generated: sql.trim(),
        results,
        explanation: explanation.trim(),
        timestamp: new Date().toISOString(),
        user_id: userId
      };
    } catch (error) {
      throw new Error(`Query processing failed: ${error}`);
    }
  }

  private async executeSQLQuery(sql: string): Promise<any[]> {
    // Mock SQL execution - in production, this would connect to actual database
    const mockResults = this.getMockResults(sql);
    
    // Simulate query execution delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return mockResults;
  }

  private getMockResults(sql: string): any[] {
    const sqlLower = sql.toLowerCase();
    
    if (sqlLower.includes('high risk') || sqlLower.includes('churn')) {
      return [
        {
          name: 'Mike Chen',
          department: 'Engineering',
          risk_score: 0.75,
          risk_level: 'HIGH',
          risk_factors: ['Recent hire', 'Below average engagement', 'Salary concerns']
        },
        {
          name: 'Lisa Wang',
          department: 'Marketing',
          risk_score: 0.68,
          risk_level: 'HIGH',
          risk_factors: ['Low performance rating', 'Manager relationship issues']
        }
      ];
    }
    
    if (sqlLower.includes('engagement') || sqlLower.includes('satisfaction')) {
      return [
        {
          department: 'Engineering',
          avg_engagement: 8.2,
          employee_count: 15
        },
        {
          department: 'Marketing',
          avg_engagement: 7.8,
          employee_count: 12
        },
        {
          department: 'Sales',
          avg_engagement: 7.5,
          employee_count: 20
        }
      ];
    }
    
    if (sqlLower.includes('performance') || sqlLower.includes('rating')) {
      return [
        {
          name: 'John Smith',
          department: 'Engineering',
          latest_rating: 4.5,
          review_date: '2024-01-15'
        },
        {
          name: 'Sarah Johnson',
          department: 'Marketing',
          latest_rating: 4.0,
          review_date: '2024-01-20'
        }
      ];
    }
    
    if (sqlLower.includes('count') || sqlLower.includes('total')) {
      return [
        {
          total_employees: 47,
          active_employees: 45,
          recent_hires: 8
        }
      ];
    }
    
    // Default response
    return [
      {
        message: 'Query executed successfully',
        timestamp: new Date().toISOString()
      }
    ];
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Mock SQL generation for demo purposes
  private generateMockSQL(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('high risk') || queryLower.includes('churn')) {
      return `SELECT e.id, e.name, e.department, cp.risk_score, cp.risk_level, cp.risk_factors
FROM employees e
JOIN churn_predictions cp ON e.id = cp.employee_id
WHERE cp.risk_level IN ('HIGH', 'CRITICAL')
ORDER BY cp.risk_score DESC
LIMIT 10;`;
    }
    
    if (queryLower.includes('engagement') && queryLower.includes('department')) {
      return `SELECT e.department, AVG(er.overall_score) as avg_engagement, COUNT(e.id) as employee_count
FROM employees e
JOIN engagement_records er ON e.id = er.employee_id
GROUP BY e.department
ORDER BY avg_engagement DESC;`;
    }
    
    if (queryLower.includes('performance') || queryLower.includes('top performer')) {
      return `SELECT e.id, e.name, e.department, pr.rating, pr.review_date
FROM employees e
JOIN performance_records pr ON e.id = pr.employee_id
WHERE pr.rating >= 4.0
ORDER BY pr.rating DESC, pr.review_date DESC
LIMIT 10;`;
    }
    
    if (queryLower.includes('recent hire') || queryLower.includes('6 months')) {
      return `SELECT e.id, e.name, e.department, e.hire_date, 
       AVG(pr.rating) as avg_performance,
       AVG(er.overall_score) as avg_engagement
FROM employees e
LEFT JOIN performance_records pr ON e.id = pr.employee_id
LEFT JOIN engagement_records er ON e.id = er.employee_id
WHERE e.hire_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
GROUP BY e.id, e.name, e.department, e.hire_date
ORDER BY e.hire_date DESC;`;
    }
    
    // Default query
    return `SELECT COUNT(*) as total_employees FROM employees;`;
  }

  // Mock explanation generation for demo purposes
  private generateMockExplanation(query: string, results: any[]): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('high risk') || queryLower.includes('churn')) {
      const highRiskCount = results.length;
      return `Based on our AI analysis, we've identified ${highRiskCount} employees with high churn risk. These employees show concerning patterns in their engagement scores, performance trends, or other risk indicators. 

Key insights:
• Immediate attention is needed for employees with risk scores above 70%
• Common risk factors include recent performance declines and low engagement
• Consider scheduling one-on-one meetings to understand their concerns

Recommended actions:
• Prioritize retention conversations with critical risk employees
• Review compensation and career development opportunities
• Implement targeted engagement initiatives`;
    }
    
    if (queryLower.includes('engagement') && queryLower.includes('department')) {
      return `This analysis shows engagement levels across different departments in your organization.

Key insights:
• Engineering teams show the highest average engagement at 8.2/10
• Marketing follows closely with 7.8/10 engagement
• Sales teams have room for improvement at 7.5/10

Recommended actions:
• Share best practices from high-performing departments
• Investigate specific challenges in lower-scoring departments
• Consider department-specific engagement initiatives`;
    }
    
    if (queryLower.includes('performance') || queryLower.includes('top performer')) {
      return `Here are your top-performing employees based on recent performance reviews.

Key insights:
• These employees consistently exceed expectations with ratings of 4.0+
• They represent your high-potential talent pool
• Strong performers are often at risk of being poached by competitors

Recommended actions:
• Ensure competitive compensation for top performers
• Provide challenging projects and growth opportunities
• Consider them for leadership development programs`;
    }
    
    // Default explanation
    return `The analysis provides insights into your workforce metrics and patterns.

Key insights:
• Data shows current organizational health indicators
• Trends can help predict future workforce needs
• Regular monitoring enables proactive HR decisions

Recommended actions:
• Continue monitoring key metrics regularly
• Investigate any concerning trends
• Use insights to inform HR strategy and policies`;
  }

  // Predefined query templates for common HR questions
  getQueryTemplates(): Array<{ title: string; query: string; description: string }> {
    return [
      {
        title: 'High Risk Employees',
        query: 'Show me all employees with high churn risk',
        description: 'Identifies employees at risk of leaving the company'
      },
      {
        title: 'Department Engagement',
        query: 'What is the average engagement score by department?',
        description: 'Compares engagement levels across different departments'
      },
      {
        title: 'Performance Leaders',
        query: 'Who are the top performers in the last quarter?',
        description: 'Lists employees with highest performance ratings'
      },
      {
        title: 'Recent Hires Status',
        query: 'How are employees hired in the last 6 months performing?',
        description: 'Analyzes performance and engagement of recent hires'
      },
      {
        title: 'Manager Effectiveness',
        query: 'Which managers have the highest team engagement scores?',
        description: 'Identifies managers with most engaged teams'
      },
      {
        title: 'Salary Analysis',
        query: 'Show salary distribution by department and role',
        description: 'Analyzes compensation patterns across the organization'
      }
    ];
  }

  // Validate query for security and complexity
  validateQuery(query: string): { valid: boolean; error?: string } {
    const forbiddenKeywords = ['drop', 'delete', 'update', 'insert', 'alter', 'create'];
    const queryLower = query.toLowerCase();
    
    for (const keyword of forbiddenKeywords) {
      if (queryLower.includes(keyword)) {
        return {
          valid: false,
          error: `Query contains forbidden operation: ${keyword}`
        };
      }
    }
    
    if (query.length > 500) {
      return {
        valid: false,
        error: 'Query is too long. Please keep it under 500 characters.'
      };
    }
    
    return { valid: true };
  }
}

// Utility functions for query processing
export const queryUtils = {
  formatResults: (results: any[]): string => {
    if (!results || results.length === 0) {
      return 'No results found.';
    }
    
    return JSON.stringify(results, null, 2);
  },
  
  extractMetrics: (results: any[]): Record<string, number> => {
    const metrics: Record<string, number> = {};
    
    results.forEach(row => {
      Object.entries(row).forEach(([key, value]) => {
        if (typeof value === 'number') {
          metrics[key] = (metrics[key] || 0) + value;
        }
      });
    });
    
    return metrics;
  },
  
  categorizeRisk: (riskScore: number): string => {
    if (riskScore >= 0.8) return 'CRITICAL';
    if (riskScore >= 0.6) return 'HIGH';
    if (riskScore >= 0.3) return 'MEDIUM';
    return 'LOW';
  }
};
