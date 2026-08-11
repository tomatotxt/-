--[[
    ================================================================
    InputAPI - Lightweight, Universal User Input Capture Library
    Supported Platforms: PC, Mobile, Console
    ================================================================
--]]

local UserInputService = game:GetService("UserInputService")

-- =================================================================
-- [1] CUSTOM FAST SIGNAL IMPLEMENTATION
-- =================================================================
local Connection = {}
Connection.__index = Connection

function Connection.new(signal, listener)
    return setmetatable({
        _signal = signal,
        _listener = listener,
        Connected = true,
    }, Connection)
end

function Connection:Disconnect()
    if not self.Connected then return end
    self.Connected = false
    
    local listeners = self._signal._listeners
    for i = #listeners, 1, -1 do
        if listeners[i] == self then
            table.remove(listeners, i)
            break
        end
    end
end

local Signal = {}
Signal.__index = Signal

function Signal.new()
    return setmetatable({ _listeners = {} }, Signal)
end

function Signal:Connect(listener)
    assert(type(listener) == "function", "Listener must be a function")
    local connection = Connection.new(self, listener)
    table.insert(self._listeners, connection)
    return connection
end

function Signal:Once(listener)
    local connection
    connection = self:Connect(function(...)
        connection:Disconnect()
        listener(...)
    end)
    return connection
end

function Signal:Wait()
    local thread = coroutine.running()
    self:Once(function(...)
        task.spawn(thread, ...)
    end)
    return coroutine.yield()
end

function Signal:Fire(...)
    local listeners = self._listeners
    for i = 1, #listeners do
        local conn = listeners[i]
        if conn and conn.Connected then
            task.spawn(conn._listener, ...)
        end
    end
end

-- =================================================================
-- [2] INPUT NODE CLASS (Per Key / KeyCode / Touch Object)
-- =================================================================
local InputNode = {}
InputNode.__index = InputNode

function InputNode.new(inputKey)
    local self = setmetatable({}, InputNode)
    
    self.InputKey = inputKey
    
    -- Event Signals
    self.Pressed = Signal.new()
    self.PressedDown = self.Pressed -- Alias
    self.PressedUp = Signal.new()
    self.Released = self.PressedUp -- Alias
    
    return self
end

-- =================================================================
-- [3] CORE INPUT MANAGER ARCHITECTURE
-- =================================================================
local InputAPI = {
    IgnoreGameProcessed = true, -- If true, ignores inputs processed by UI (e.g., chat typing)
    _nodes = {},
    _activeInputs = {}
}

-- Normalize inputs (Support Enum.KeyCode, Enum.UserInputType, or String inputs like "P" or "ButtonA")
local function normalizeInput(key)
    if typeof(key) == "EnumItem" then
        return key
    elseif type(key) == "string" then
        -- Attempt to resolve as KeyCode
        if Enum.KeyCode[key] then
            return Enum.KeyCode[key]
        -- Attempt to resolve as UserInputType
        elseif Enum.UserInputType[key] then
            return Enum.UserInputType[key]
        end
    end
    error("[InputAPI] Invalid key or Enum supplied: " .. tostring(key), 3)
end

-- Retrieve or construct an InputNode for a specific Key/Button
local function getNode(key)
    local normalized = normalizeInput(key)
    if not InputAPI._nodes[normalized] then
        InputAPI._nodes[normalized] = InputNode.new(normalized)
    end
    return InputAPI._nodes[normalized]
end

-- Trigger internal handlers
local function handleInput(inputObject, isEnded)
    local keyCodeNode = InputAPI._nodes[inputObject.KeyCode]
    local typeNode = InputAPI._nodes[inputObject.UserInputType]

    if not isEnded then
        if keyCodeNode then keyCodeNode.Pressed:Fire(inputObject) end
        if typeNode then typeNode.Pressed:Fire(inputObject) end
    else
        if keyCodeNode then keyCodeNode.PressedUp:Fire(inputObject) end
        if typeNode then typeNode.PressedUp:Fire(inputObject) end
    end
end

-- Hook Roblox UserInputService Events
UserInputService.InputBegan:Connect(function(inputObject, gameProcessed)
    if InputAPI.IgnoreGameProcessed and gameProcessed then return end
    InputAPI._activeInputs[inputObject.KeyCode] = true
    InputAPI._activeInputs[inputObject.UserInputType] = true
    handleInput(inputObject, false)
end)

UserInputService.InputEnded:Connect(function(inputObject, gameProcessed)
    InputAPI._activeInputs[inputObject.KeyCode] = nil
    InputAPI._activeInputs[inputObject.UserInputType] = nil
    handleInput(inputObject, true)
end)

-- Utility: Is Key Currently Being Held Down?
function InputAPI:IsKeyDown(key)
    local normalized = normalizeInput(key)
    return UserInputService:IsKeyDown(normalized) or InputAPI._activeInputs[normalized] == true
end

-- Meta Index Magic: API[Enum.KeyCode.P] or API["P"]
setmetatable(InputAPI, {
    __index = function(_, key)
        return getNode(key)
    end
})

return InputAPI
