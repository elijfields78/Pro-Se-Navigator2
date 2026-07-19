import { Redirect } from 'expo-router';

export default function TabIndex() {
  // The app opens straight into the general chat (new IA).
  return <Redirect href="/home" />;
}
