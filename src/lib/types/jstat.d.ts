declare module 'jstat' {
  export const jStat: {
    centralF: {
      /**
       * Calculates the cumulative distribution function of the F distribution
       * @param x The value to evaluate the CDF at
       * @param df1 The numerator degrees of freedom
       * @param df2 The denominator degrees of freedom
       * @returns The probability that a random variable from the F distribution is less than or equal to x
       */
      cdf(x: number, df1: number, df2: number): number;
      
      /**
       * Calculates the probability density function of the F distribution
       * @param x The value to evaluate the PDF at
       * @param df1 The numerator degrees of freedom
       * @param df2 The denominator degrees of freedom
       * @returns The probability density at x
       */
      pdf(x: number, df1: number, df2: number): number;
      
      /**
       * Calculates the inverse cumulative distribution function of the F distribution
       * @param p The probability value (between 0 and 1)
       * @param df1 The numerator degrees of freedom
       * @param df2 The denominator degrees of freedom
       * @returns The value x such that cdf(x, df1, df2) = p
       */
      inv(p: number, df1: number, df2: number): number;
      
      /**
       * Returns the mean of the F distribution
       * @param df1 The numerator degrees of freedom
       * @param df2 The denominator degrees of freedom
       * @returns The mean of the F distribution
       */
      mean(df1: number, df2: number): number;
      
      /**
       * Returns the mode of the F distribution
       * @param df1 The numerator degrees of freedom
       * @param df2 The denominator degrees of freedom
       * @returns The mode of the F distribution
       */
      mode(df1: number, df2: number): number;
      
      /**
       * Generates a random sample from the F distribution
       * @param df1 The numerator degrees of freedom
       * @param df2 The denominator degrees of freedom
       * @returns A random sample from the F distribution
       */
      sample(df1: number, df2: number): number;
    };
    
    // Add other distributions as needed
  };
  
  export default jStat;
} 