import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./Routes";
import { DateFilterProvider } from "./Contexts/DateFilterContext";
import { ProductProvider } from "./Contexts/ProductContext";

function App() {
  return (
    <BrowserRouter>
      <DateFilterProvider>
        <ProductProvider>
          <AppRoutes />
        </ProductProvider>
      </DateFilterProvider>
    </BrowserRouter>
  );
}

export default App;
