const fs = require('fs');
const path = require('path');
const axios = require('axios');

class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.pluginsDir = path.join(__dirname, 'plugins');
        this.pluginListFile = path.join(this.pluginsDir, 'installed.json');
        
        // Create plugins directory if it doesn't exist
        if (!fs.existsSync(this.pluginsDir)) {
            fs.mkdirSync(this.pluginsDir, { recursive: true });
        }
        
        // Create installed.json if it doesn't exist
        if (!fs.existsSync(this.pluginListFile)) {
            fs.writeFileSync(this.pluginListFile, JSON.stringify([], null, 2));
        }
    }

    // Load all plugins from /plugins folder
    loadAll() {
        const files = fs.readdirSync(this.pluginsDir).filter(f => f.endsWith('.js'));
        
        for (const file of files) {
            try {
                delete require.cache[require.resolve(path.join(this.pluginsDir, file))];
                const plugin = require(path.join(this.pluginsDir, file));
                
                if (plugin.command && plugin.execute) {
                    this.plugins.set(plugin.command, plugin);
                    
                    // Also register aliases
                    if (plugin.aliases && Array.isArray(plugin.aliases)) {
                        plugin.aliases.forEach(alias => {
                            this.plugins.set(alias, plugin);
                        });
                    }
                    
                    console.log(`✅ Loaded plugin: ${plugin.command}`);
                }
            } catch (error) {
                console.error(`❌ Failed to load ${file}:`, error.message);
            }
        }
        
        return this.plugins;
    }

    // Install plugin from URL
    async install(url) {
        try {
            // Download plugin code
            const response = await axios.get(url);
            const code = response.data;
            
            // Basic validation
            if (!code.includes('module.exports') || !code.includes('execute')) {
                throw new Error('Invalid plugin format. Must export command and execute function.');
            }
            
            // Extract command name from code
            const commandMatch = code.match(/command:\s*['"](.+?)['"]/);
            if (!commandMatch) {
                throw new Error('Plugin must define a command name.');
            }
            
            const commandName = commandMatch[1];
            const filename = `${commandName}.js`;
            const filepath = path.join(this.pluginsDir, filename);
            
            // Save plugin file
            fs.writeFileSync(filepath, code);
            
            // Load the plugin
            delete require.cache[require.resolve(filepath)];
            const plugin = require(filepath);
            this.plugins.set(plugin.command, plugin);
            
            // Register aliases
            if (plugin.aliases && Array.isArray(plugin.aliases)) {
                plugin.aliases.forEach(alias => {
                    this.plugins.set(alias, plugin);
                });
            }
            
            // Save to installed list
            this.saveInstalledPlugin(url, commandName, filename);
            
            return { success: true, command: commandName, filename };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Remove plugin
    async remove(commandOrUrl) {
        try {
            const installed = this.getInstalledPlugins();
            let pluginInfo = installed.find(p => p.command === commandOrUrl || p.url === commandOrUrl);
            
            if (!pluginInfo) {
                return { success: false, error: 'Plugin not found' };
            }
            
            const filepath = path.join(this.pluginsDir, pluginInfo.filename);
            
            // Delete file
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
            
            // Remove from memory
            this.plugins.delete(pluginInfo.command);
            
            // Remove from installed list
            const updated = installed.filter(p => p.command !== pluginInfo.command);
            fs.writeFileSync(this.pluginListFile, JSON.stringify(updated, null, 2));
            
            return { success: true, command: pluginInfo.command };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get plugin by command
    get(command) {
        return this.plugins.get(command);
    }

    // List all plugins
    list() {
        return Array.from(this.plugins.values());
    }

    // Get installed plugins info
    getInstalledPlugins() {
        try {
            return JSON.parse(fs.readFileSync(this.pluginListFile, 'utf8'));
        } catch {
            return [];
        }
    }

    // Save installed plugin info
    saveInstalledPlugin(url, command, filename) {
        const installed = this.getInstalledPlugins();
        installed.push({
            url,
            command,
            filename,
            installedAt: new Date().toISOString()
        });
        fs.writeFileSync(this.pluginListFile, JSON.stringify(installed, null, 2));
    }
}

module.exports = new PluginManager();
