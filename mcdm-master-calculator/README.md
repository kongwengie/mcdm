# MCDM Master

MCDM Master is a powerful, modern, and intuitive web application for Multi-Criteria Decision Making (MCDM). It allows you to evaluate and rank multiple alternatives based on various criteria using a wide range of established mathematical methods.

## Features

- **Hierarchical Criteria**: Create complex decision models with nested criteria and sub-criteria.
- **Multiple Methods**: Supports over 30 MCDM methods including AHP, TOPSIS, VIKOR, SAW, PROMETHEE, and their Fuzzy variants.
- **Live Calculation**: See results update instantly as you change weights or values.
- **Calculation Steps**: Transparently view the intermediate mathematical steps (normalized matrices, weighted matrices, etc.) for each method.
- **AHP Weight Calculator**: Built-in pairwise comparison tool to calculate criteria weights using the Analytic Hierarchy Process, complete with consistency checks.
- **Import/Export**: Save your decision models as JSON files and load them later.

## How to Use

### 1. Define Criteria
Start by defining the criteria you will use to evaluate your alternatives.
- Click the **"+"** button in the Criteria section to add a new criterion.
- You can add **Sub-criteria** to create a hierarchy (e.g., "Cost" could have sub-criteria "Initial Cost" and "Maintenance Cost").
- Set the **Type** for each criterion:
  - **Benefit**: Higher values are better (e.g., Quality, Lifespan).
  - **Cost**: Lower values are better (e.g., Price, Weight).
- Set the **Weight** for each criterion manually, or use the **"Calculate weights using AHP"** button to derive weights using pairwise comparisons.

### 2. Add Alternatives
Alternatives are the options you are choosing between (e.g., Vendor A, Vendor B, Vendor C).
- Click the **"+"** button in the Decision Matrix section to add a new alternative.
- Fill in the values for each alternative against every leaf criterion.

### 3. Select a Method
Choose the MCDM method you want to use for ranking your alternatives.
- On the left sidebar, browse through the categories (Crisp, Fuzzy, Hybrid) and select a method.
- The app will automatically calculate the rankings based on your selected method.

### 4. View Results & Steps
- Use the toggle at the top right to switch between **Results** and **Calculation Steps**.
- **Results**: Shows the final ranking of your alternatives.
- **Calculation Steps**: Shows the detailed mathematical matrices and formulas used to arrive at the final ranking.
- **Comparison**: Compare the rankings across all available methods simultaneously to see how sensitive your decision is to the chosen methodology.

## Built With
- React
- TypeScript
- Tailwind CSS
- D3.js (for Hierarchy Visualization)
- Vite

## Deployment
This application is configured as a Single Page Application (SPA) and is ready to be deployed to Vercel or any static hosting provider.
