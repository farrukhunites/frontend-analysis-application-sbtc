import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./Routes";
import { DateFilterProvider } from "./Contexts/DateFilterContext";

function App() {
  return (
    <BrowserRouter>
      <DateFilterProvider>
        <AppRoutes />
      </DateFilterProvider>
    </BrowserRouter>
  );
}

export default App;
