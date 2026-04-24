-- Add DELETE policy for predictions table so users can remove their own prediction history
CREATE POLICY "Users can delete own predictions"
ON public.predictions
FOR DELETE
USING (auth.uid() = user_id);